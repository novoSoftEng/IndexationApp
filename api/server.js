const express = require("express");
const multer = require("multer");
const fs = require("fs-extra");
const path = require("path");
const mongoose = require("mongoose");
const { Interface } = require("readline");
const FormData = require('form-data'); // Ensure you have form-data module installed
// Initialize Express app
const app = express();
const cors = require('cors');
app.use(cors());
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
// Load environment variables
require('dotenv').config();

// Access environment variables
const PORT = process.env.PORT;
const ImagesService = process.env.IMAGES_SERVICE;
const mongoUri = process.env.MONGO_URI;


mongoose.set('debug', true);
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  dbName: process.env.DATABASE_NAME, // Ensure the correct database is selected
})
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));


// MongoDB schema and model
const imageSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  thumbnail : {type : String},
  category : {type : String },
  uploadDate: { type: Date, default: Date.now },
  characteristics: {
      fourier_coefficients: [Number],
      zernike_moments: [Number],
      is_watertight: Boolean,
      mesh_area:Number,
      mesh_bounding_box_extents: [
       Number
      ],
      mesh_centroid: [
       Number
      ],
      mesh_volume: Number,
      num_edges: Number,
      num_faces: Number,
      num_vertices: Number,
      warning: String
    
  },
});
// const Image = mongoose.model("Image", imageSchema);
// Dynamically use collection name from .env
const collectionName = process.env.COLLECTION_NAME || 'images'; // Default to 'images' if not set
const Image = mongoose.model(collectionName, imageSchema);




// Directory for uploaded images
const UPLOAD_FOLDER = path.join(__dirname, "uploaded_images");
// Check if the folder exists, create it if not
if (!fs.existsSync(UPLOAD_FOLDER)) {
  fs.mkdirSync(UPLOAD_FOLDER, { recursive: true }); // Ensure all intermediate directories are created
  console.log(`Folder created at: ${UPLOAD_FOLDER}`);
} else {
  console.log(`Folder already exists at: ${UPLOAD_FOLDER}`);
}
fs.ensureDirSync(UPLOAD_FOLDER);

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_FOLDER);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});
const upload = multer({ 
  storage,
}).fields([
  { name: 'objFiles' }, // Allow up to 20 .obj files
  { name: 'thumbnails' }, // Allow up to 20 thumbnails
]);


// Middleware to parse JSON
app.use(express.json());

// Helper function to list all images
async function listImages() {
  const files = await fs.readdir(UPLOAD_FOLDER);
  return files.filter((file) => fs.statSync(path.join(UPLOAD_FOLDER, file)).isFile());
}

// Upload images with their corresponding thumbnails
app.post("/upload",  async (req, res) => {
  
  upload(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ message: `Multer error: ${err.message}` });
    } else if (err) {
      return res.status(500).json({ message: `Server error: ${err.message}` });
    }

    const { files } = req;
    const category = req.body.category;

    if (!files || !files.objFiles || !files.thumbnails) {
      return res.status(400).json({ message: "Both .obj files and thumbnails are required." });
    }

    // Separate objFiles and thumbnails
    const objFiles = files.objFiles;
    const thumbnails = files.thumbnails;


  // Pair .obj files with their corresponding thumbnails based on filename
  const objThumbnailPairs = objFiles.map((objFile) => {
    const thumbnail = thumbnails.find(
      (thumb) =>
        thumb.originalname.split(".")[0] === objFile.originalname.split(".")[0]
    );
    return { objFile, thumbnail };
  });

  // Ensure every .obj file has a corresponding thumbnail
  const unpairedFiles = objThumbnailPairs.filter(({ thumbnail }) => !thumbnail);
  if (unpairedFiles.length > 0) {
    return res.status(400).json({
      message: "Some .obj files are missing corresponding thumbnails",
      unpairedFiles: unpairedFiles.map((pair) => pair.objFile.originalname),
    });
  }

  try {
    // Create FormData to send .obj files to the ImagesService
    const formData = new FormData();
    objFiles.forEach((file) => {
      const filePath = path.join(UPLOAD_FOLDER, file.filename);
      formData.append("files", fs.createReadStream(filePath), file.originalname);
    });

    // POST request to ImagesService for descriptor calculation
    const response = await fetch(`http://${ImagesService}/calculate-descriptors`, {
      method: "POST",
      headers: formData.getHeaders(),
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Error calculating descriptors: ${response.statusText}`);
    }

    const { results } = await response.json();

    // Prepare MongoDB documents with paired data
    const mongoDocs = objThumbnailPairs.map(({ objFile, thumbnail }) => ({
      filename: objFile.originalname,
      thumbnail: thumbnail.originalname,
      category,
      characteristics: results[objFile.originalname],
    }));

    // Save all metadata and characteristics to MongoDB
    await Image.insertMany(mongoDocs);

    res.status(201).json({
      message: "Files and thumbnails uploaded and processed successfully",
      files: objThumbnailPairs.map(({ objFile, thumbnail }) => ({
        objFile: objFile.originalname,
        thumbnail: thumbnail.originalname,
      })),
    });
  } catch (error) {
    console.error("Error processing files:", error.message);
    res.status(500).json({ message: "Error processing files", error: error.message });
  }
});
});
// Download an image or list all images
app.get("/download/:filename?", async (req, res) => {
  const { filename } = req.params;

  if (filename) {
    const filePath = path.join(UPLOAD_FOLDER, filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: `Image '${filename}' not found` });
    }
    return res.sendFile(filePath);
  }

  // List all images
  const images = await listImages();
  res.status(200).json({images});
});

// Delete an image or all images
app.delete("/delete/:filename?", async (req, res) => {
  const { filename } = req.params;

  if (filename) {
    const filePath = path.join(UPLOAD_FOLDER, filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: `Image '${filename}' not found` });
    }

    // Remove the file and its metadata
    await fs.remove(filePath);
    await Image.deleteOne({ filename });
    return res.status(200).json({ message: `Image '${filename}' deleted successfully` });
  }

  // Delete all images and their metadata
  const images = await listImages();
  for (const image of images) {
    await fs.remove(path.join(UPLOAD_FOLDER, image));
  }
  await Image.deleteMany({});
  res.status(200).json({ message: "All images deleted successfully" });
});

// Get all files from MongoDB
app.get('/images', async (req, res) => {
    try {
      // Fetch all images from the database
      const images = await Image.find();
  
      if (!images || images.length === 0) {
        return res.status(404).json({ message: 'No files found' });
      }
  
      res.status(200).json({images});
    } catch (error) {
      console.error('Error fetching files:', error);
      res.status(500).json({ message: 'Error fetching files from MongoDB', error: error.message });
    }
  });
  app.get('/images/:filename?', async (req, res) => {
    try {
        const { filename } = req.params;
        const image = await Image.find({"filename" : filename });
  
      if (!image || image.length ===0 ) {
        return res.status(404).json({ message: 'No files found' });
      }
  
      res.status(200).json({image});
    } catch (error) {
      console.error('Error fetching files:', error);
      res.status(500).json({ message: 'Error fetching files from MongoDB', error: error.message });
    }
  });

  // Get images by category
app.get('/images/category/:category', async (req, res) => {
  try {
      const { category } = req.params;

      // Fetch images that match the specified category
      const images = await Image.find({ category });
      res.status(200).json({ images });
  } catch (error) {
      console.error('Error fetching images by category:', error);
      res.status(500).json({ message: 'Error fetching images from MongoDB', error: error.message });
  }
});


// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
