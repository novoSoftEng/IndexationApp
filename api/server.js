const express = require("express");
const multer = require("multer");
const fs = require("fs-extra");
const path = require("path");
const mongoose = require("mongoose");
const { Interface } = require("readline");
const FormData = require('form-data'); // Ensure you have form-data module installed
// Initialize Express app
const app = express();
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const PORT = 5500;
const ImagesService = "127.0.0.1:5000";
// MongoDB connection
mongoose.connect("mongodb://localhost:27017/imageDB")
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));


// MongoDB schema and model
const imageSchema = new mongoose.Schema({
    filename: { type: String, required: true },
    uploadDate: { type: Date, default: Date.now },
    characteristics: {
      color_histogram: [[Number]], // Array of arrays with numerical values for histogram bins
      dominant_colors: [[Number]], // Array of arrays with RGB values for dominant colors
      texture_descriptors: [Number], // Array of numerical values for texture descriptors
      hu_moments: [Number], // Array of numerical values for Hu moments
    },
  });
const Image = mongoose.model("Image", imageSchema);

// Directory for uploaded images
const UPLOAD_FOLDER = path.join(__dirname, "uploaded_images");
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
const upload = multer({ storage });

// Middleware to parse JSON
app.use(express.json());

// Helper function to list all images
async function listImages() {
  const files = await fs.readdir(UPLOAD_FOLDER);
  return files.filter((file) => fs.statSync(path.join(UPLOAD_FOLDER, file)).isFile());
}

// Routes

// Upload images
/*app.post("/upload", upload.array("images"), async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ message: "No images provided" });
  }

  const uploadedFiles = req.files.map((file) => file.originalname);

  try {
    // For each uploaded file, send it to the ImagesService to calculate characteristics
    const imageDocs = [];
    for (const file of req.files) {
      const filePath = path.join(UPLOAD_FOLDER, file.filename);

      // Read the file as binary data
      const imageBuffer = await fs.readFile(filePath);

      // Make a POST request to the ImagesService to get characteristics
      const response = await fetch(`http://${ImagesService}/calculate-descriptors`, {
        method: "POST",
        headers: {
          "Content-Type": "application/octet-stream",
        },
        body: {'images' :imageBuffer} ,
      });

      if (!response.ok) {
        throw new Error(`Error calculating characteristics for ${file.filename}: ${response.statusText}`);
      }

      const characteristics = await response.json();

      // Prepare the document to be inserted into MongoDB
      imageDocs.push({
        filename: file.filename,
        caracteristics: characteristics,
      });
    }

    // Save all image metadata and characteristics to MongoDB
    await Image.insertMany(imageDocs);

    res.status(201).json({ message: "Images uploaded and processed successfully", files: uploadedFiles });
  } catch (error) {
    console.error("Error processing images:", error.message);
    res.status(500).json({ message: "Error processing images", error: error.message });
  }
});
*/



// Upload images
app.post("/upload", upload.array("images"), async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ message: "No images provided" });
  }

  const uploadedFiles = req.files.map((file) => file.originalname);

  try {
    // Create a new FormData object to send all files
    const formData = new FormData();

    // Append all files to the FormData object
    req.files.forEach((file) => {
      const filePath = path.join(UPLOAD_FOLDER, file.filename);
      formData.append('images', fs.createReadStream(filePath), file.originalname); // Append each file
    });

    // Make a POST request to the ImagesService to get characteristics for all images at once
    const response = await fetch(`http://${ImagesService}/calculate-descriptors`, {
      method: "POST",
      headers: formData.getHeaders(), // Set headers from FormData
      body: formData, // Send all files in the body of the request
    });

    if (!response.ok) {
      throw new Error(`Error calculating characteristics: ${response.statusText}`);
    }

    // Parse the JSON response from the ImagesService
    const { results } = await response.json();

    // Store characteristics for each file
    const imageDocs = {};
    req.files.forEach((file) => {
      imageDocs[file.filename] = results[file.filename];
    });

    // Save all image metadata and characteristics to MongoDB
    const mongoDocs = Object.entries(imageDocs).map(([filename, characteristics]) => ({
      filename,
      characteristics: characteristics,
    }));

    await Image.insertMany(mongoDocs);

    res.status(201).json({ message: "Images uploaded and processed successfully", files: uploadedFiles, results: imageDocs });
  } catch (error) {
    console.error("Error processing images:", error.message);
    res.status(500).json({ message: "Error processing images", error: error.message });
  }
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
  res.status(200).json({ message: "Available images", files: images });
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
  
      res.status(200).json({
        message: 'Files retrieved successfully',
        data: images, // Return the image data from MongoDB
      });
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
  
      res.status(200).json({
        message: 'Files retrieved successfully',
        data: image, // Return the image data from MongoDB
      });
    } catch (error) {
      console.error('Error fetching files:', error);
      res.status(500).json({ message: 'Error fetching files from MongoDB', error: error.message });
    }
  });

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
