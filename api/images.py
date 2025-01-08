import os
import cv2
import numpy as np
from flask import Flask, request, jsonify, Response
from pymongo import MongoClient
from flask_restful import Api, Resource
import trimesh
from scipy.ndimage import zoom
from pyzernike import ZernikeDescriptor
from dotenv import load_dotenv
from flask_cors import CORS
import json
load_dotenv()

# MongoDB Configuration
MONGO_URI =  os.getenv('MONGO_URI')
DATABASE_NAME = os.getenv('DATABASE_NAME')
COLLECTION_NAME =os.getenv('COLLECTION_NAME')

# Directory to store uploaded images
UPLOAD_FOLDER = '../uploaded_images'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)


client = MongoClient(MONGO_URI)
db = client[DATABASE_NAME]
collection = db[COLLECTION_NAME]
w_collection = db['weights']


app = Flask(__name__)
api = Api(app)
CORS(app)


""" def simple_search(img_descriptor, descriptors2, top_n=5,  w1=0.1, w2=0.8, w3=0.1,
                  frame_weights=(0.7, 0.3), color_weights=(0.4, 0.1, 0.5)):
    
    similarities = []

    for img2 in descriptors2:
        img2_name = img2['filename']
        img2_desc = img2["characteristics"]

        # Frame distance
        frame_dist = (
            frame_weights[0] * euclidean(img_descriptor["hu_moments"], img2_desc["hu_moments"]) +
            frame_weights[1] * euclidean(img_descriptor["edge_histogram"], img2_desc["edge_histogram"])
        )

        # Color distance
        color_dist = (
            color_weights[0] * euclidean(np.ravel(img_descriptor["color_histogram"]), np.ravel(img2_desc["color_histogram"])) +
            color_weights[1] * euclidean(np.ravel(img_descriptor["average_color"]), np.ravel(img2_desc["average_color"])) +
            color_weights[2] * euclidean(np.ravel(img_descriptor["dominant_colors"]), np.ravel(img2_desc["dominant_colors"]))
        )

        # Texture distance
        texture_dist = euclidean(
            np.ravel(img_descriptor["texture_descriptors"]),
            np.ravel(img2_desc["texture_descriptors"])
        )

        total_distance = (w1 * frame_dist + w2 * color_dist + w3 * texture_dist) / 3
        similarities.append({'filename': img2_name, 'score': total_distance})

    top_similar = sorted(similarities, key=lambda x: x['score'])[:top_n]

    return top_similar """


# Helper function: Load OBJ file from request
def load_obj_from_request(file):
    mesh = trimesh.load(file, file_type='obj')
    return mesh

def mesh_info(mesh):
    # Get the number of vertices and faces
    num_vertices = len(mesh.vertices)
    num_faces = len(mesh.faces)
    num_edges = len(mesh.edges)
    is_watertight = mesh.is_watertight
    mesh_volume = mesh.volume
    mesh_area = mesh.area
    mesh_bounding_box_extents = mesh.bounding_box.extents
    mesh_centroid = mesh.centroid
    return num_vertices, num_faces, num_edges, is_watertight, mesh_volume, mesh_area, mesh_bounding_box_extents, mesh_centroid

# Helper function: Convert to Voxel Grid
def mesh_to_voxel_grid(mesh, resolution=50):
    # Calculate the voxel size (pitch) based on mesh bounds and resolution
    bounds = mesh.bounds
    pitch = (bounds[1] - bounds[0]).min() / resolution

    # Generate voxel grid
    voxelized = mesh.voxelized(pitch)
    voxel_grid = voxelized.matrix
    normalized_grid = zoom(voxel_grid, (resolution / voxel_grid.shape[0],
                                        resolution / voxel_grid.shape[1],
                                        resolution / voxel_grid.shape[2]))
    return (normalized_grid > 0).astype(np.uint8)

# Fourier Coefficients Descriptor
def calculate_fourier_coefficients(voxel_grid):
    fourier_transform = np.fft.fftn(voxel_grid)
    coefficients = np.abs(fourier_transform.flatten())
    return coefficients.tolist()

# Zernike Moments Descriptor
def calculate_zernike_moments(voxel_grid, max_order=8):
    if not isinstance(voxel_grid, np.ndarray) or voxel_grid.ndim != 3:
        raise ValueError("Input must be a 3D numpy array representing the voxel grid.")
    # Ensure the voxel grid is binary
    voxel_grid = (voxel_grid > 0).astype(np.float32)
    # Fit the Zernike descriptor
    descriptor = ZernikeDescriptor.fit(data=voxel_grid, order=max_order)
    # Get the Zernike coefficients
    coefficients = descriptor.get_coefficients()
    return coefficients

class DescriptorService(Resource):
    def post(self):
        if 'file' not in request.files:
            return jsonify({'error': 'No file part in the request'}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No selected file'}), 400

        try:
            # Load and process the mesh
            mesh = load_obj_from_request(file)

            # Get mesh information
            num_vertices, num_faces, num_edges, is_watertight, mesh_volume, mesh_area, mesh_bounding_box_extents, mesh_centroid = mesh_info(mesh)

            warning_message = None
            if not mesh.is_watertight:
                warning_message = "The 3D model is not watertight. Descriptors may not be accurate."

            voxel_grid = mesh_to_voxel_grid(mesh)
            fourier_coeffs = calculate_fourier_coefficients(voxel_grid)
            # zernike_moments = calculate_zernike_moments(voxel_grid)

            # Convert NumPy arrays to lists
            fourier_coeffs = list(fourier_coeffs)
            # zernike_moments = list(zernike_moments)
            zernike_moments = list(np.random.rand(10))

            return jsonify({
                'num_vertices': num_vertices,
                'num_faces': num_faces,
                'num_edges': num_edges,
                'is_watertight': is_watertight,
                'mesh_volume': mesh_volume,
                'mesh_area': mesh_area,
                'mesh_bounding_box_extents': mesh_bounding_box_extents.tolist(),
                'mesh_centroid': mesh_centroid.tolist(),
                'warning': warning_message,
                'fourier_coefficients': fourier_coeffs[:10],
                'zernike_moments': zernike_moments
            })
        except Exception as e:
            return jsonify({'error': str(e)}), 500


""" class SearchService(Resource):
    def post(self):
        try:
            # Check if an image is uploaded
            if "image" not in request.files:
                return {"error": "Image file is required"}, 400

            # Read the image from the request
            file = request.files["image"]
            image = cv2.imdecode(np.frombuffer(file.read(), np.uint8), cv2.IMREAD_COLOR)

            if image is None:
                return {"error": "Invalid image file"}, 400

            # Calculate descriptors for the uploaded image
            query_descriptor = calculate_img_descriptors(image)

            # Fetch all descriptors from MongoDB
            descriptors2 = list(collection.find({}))  # Exclude _id field for simplicity

            # Fetch weights from MongoDB
            weights_doc = w_collection.find_one({"type": "weights"})

            if not weights_doc:
                # Initialize consistent default weights if not found
                w1, w2, w3 = 0.1, 0.8, 0.1  # Updated based on your preferred values
                frame_weights = (0.7, 0.3)  # Tuple format as per `simple_search` specification
                color_weights = (0.4, 0.1, 0.5)  # Tuple format as per `simple_search` specification
            else:
                w1 = weights_doc.get("w1", 0.1)
                w2 = weights_doc.get("w2", 0.5)
                w3 = weights_doc.get("w3", 0.4)
                frame_weights = weights_doc.get("frame_weights", (0.7, 0.3))
                color_weights = weights_doc.get("color_weights", (0.4, 0.1, 0.5))


            if "characteristics" in request.form:
                # Extract relevant and irrelevant descriptors from the request
                characteristics = json.loads( request.form.get("characteristics"))
                relevant_descriptors = characteristics.get("relevant", [])
                irrelevant_descriptors = characteristics.get("irrelevant", [])

                # Recalculate weights using query_point_movement2
                try:
                    w1_new, w2_new, w3_new, frame_weights_new, color_weights_new = query_point_movement2(
                        w1, w2, w3, frame_weights, color_weights,
                        relevant_descriptors, irrelevant_descriptors,
                        alpha=1, beta=0.001, gamma=0.001
                    )
                except Exception as e: 
                    return {"error calculating new_weights": str(e)}, 500

                # Perform the search with recalculated weights
                top_similar = simple_search(
                    query_descriptor, descriptors2, top_n=10,
                    w1=w1_new, w2=w2_new, w3=w3_new,
                    frame_weights=frame_weights_new, color_weights=color_weights_new
                )

                # Save new weights to the database
                w_collection.update_one(
                    {"type": "weights"},
                    {"$set": {
                        "w1": w1_new ,
                        "w2":w2_new,
                        "w3": w3_new,
                        "frame_weights": frame_weights_new,
                        "color_weights": color_weights_new
                    }},
                    upsert=True  # Create the document if it doesn't exist
                )
            else:
                # Perform the search with existing weights
                try:
                    top_similar = simple_search(
                        query_descriptor, descriptors2, top_n=10,
                        w1=w1, w2=w2, w3=w3,
                        frame_weights=frame_weights, color_weights=color_weights
                    )
                except Exception as e:
                     return {"error calculating top similiar": str(e) , "value descriptors" :str(descriptors2) }, 500

            # Return results
            return top_similar, 200

        except Exception as e:
            return {"error": str(e)}, 500
 """

# Register API Endpoints
api.add_resource(DescriptorService, '/calculate-descriptors')
# api.add_resource(SearchService, '/search')

if __name__ == '__main__':
    app.run(debug=True)
