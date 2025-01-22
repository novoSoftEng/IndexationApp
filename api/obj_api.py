import os
import numpy as np
from flask import Flask, request, jsonify, Response
from pymongo import MongoClient
from flask_restful import Api, Resource
from werkzeug.utils import secure_filename
import trimesh
from trimesh import Trimesh
from scipy.ndimage import zoom
from scipy.spatial.distance import euclidean
from pyzernike import ZernikeDescriptor
from dotenv import load_dotenv
from flask_cors import CORS

load_dotenv()

# MongoDB Configuration
MONGO_URI =  os.getenv('MONGO_URI')
DATABASE_NAME = os.getenv('DATABASE_NAME')
COLLECTION_NAME =os.getenv('COLLECTION_NAME')

# Directory to store uploaded images
TRANSFORM_FOLDER = '../transformed_objs'
if not os.path.exists(TRANSFORM_FOLDER):
    os.makedirs(TRANSFORM_FOLDER)

UPLOAD_FOLDER = '../uploaded_images'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

client = MongoClient(MONGO_URI)
db = client[DATABASE_NAME]
collection = db[COLLECTION_NAME]


app = Flask(__name__)
api = Api(app)
CORS(app)


def simple_search(img_descriptor, descriptors2, top_n=5, w1=0.5, w2=0.5):

    similarities = []

    for img2 in descriptors2:
        img2_name = img2['filename']
        img2_desc = img2["characteristics"]

        fourier_dist = euclidean(np.ravel(img_descriptor["fourier_coefficients"]), np.ravel(img2_desc["fourier_coefficients"]))
        zernike_dist = euclidean(np.ravel(img_descriptor["zernike_moments"]), np.ravel(img2_desc["zernike_moments"]))

        total_distance = (w1 * fourier_dist + w2 * zernike_dist) / 2
        similarities.append({'filename': img2_name, 'score': total_distance})

    top_similar = sorted(similarities, key=lambda x: x['score'])[:top_n]

    return top_similar


def load_obj_from_request(file):
    mesh = trimesh.load(file, file_type='obj')
    return mesh

def mesh_info(mesh):
    num_vertices = len(mesh.vertices)
    num_faces = len(mesh.faces)
    num_edges = len(mesh.edges)
    is_watertight = mesh.is_watertight
    mesh_volume = mesh.volume
    mesh_area = mesh.area
    mesh_bounding_box_extents = mesh.bounding_box.extents
    mesh_centroid = mesh.centroid
    return num_vertices, num_faces, num_edges, is_watertight, mesh_volume, mesh_area, mesh_bounding_box_extents, mesh_centroid

# HConvert to Voxel Grid
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

def calculate_obj_descriptors(mesh):
    # get mesh info
    num_vertices, num_faces, num_edges, is_watertight, mesh_volume, mesh_area, mesh_bounding_box_extents, mesh_centroid = mesh_info(mesh)

    # Check if the mesh is watertight
    warning_message = None
    if not mesh.is_watertight:
        warning_message = "The 3D model is not watertight. Descriptors may not be accurate."

    # Convert to voxel grid
        voxel_grid = mesh_to_voxel_grid(mesh)

    fourier_coeffs = calculate_fourier_coefficients(voxel_grid)
    zernike_moments = calculate_zernike_moments(voxel_grid, max_order=8)

    # Convert NumPy arrays to lists
    fourier_coeffs = list(fourier_coeffs)
    zernike_moments = zernike_moments.astype(float).tolist()

    # Store results
    results = {
        'num_vertices': num_vertices,
        'num_faces': num_faces,
        'num_edges': num_edges,
        'is_watertight': is_watertight,
        'mesh_volume': mesh_volume,
        'mesh_area': mesh_area,
        'mesh_bounding_box_extents': mesh_bounding_box_extents.tolist(),
        'mesh_centroid': mesh_centroid.tolist(),
        'warning': warning_message,
        'fourier_coefficients': fourier_coeffs,
        'zernike_moments': zernike_moments
    }

    return results

class DescriptorService(Resource):
    def post(self):
        """Calculate descriptors for uploaded 3D OBJ files."""
        if 'files' not in request.files:
            return {"message": "No files provided"}, 400

        files = request.files.getlist('files')
        results = {}

        for file in files:
            if file.filename == '':
                results[file.filename] = {"error": "Empty file"}
                continue

            try:
                mesh = load_obj_from_request(file)
                results[file.filename] = calculate_obj_descriptors(mesh)

            except Exception as e:
                results[file.filename] = {"error": str(e)}

        return jsonify({"message": "Descriptors calculated", "results": results})


class SearchService(Resource):
    def post(self):
        try:
            # Check if an image is uploaded
            if "file" not in request.files:
                return {"error": "Image file is required"}, 400

            # Read the object from the request
            file = request.files["file"]
            mesh = load_obj_from_request(file)

            if mesh is None:
                return {"error": "Invalid image file"}, 400

            # Calculate descriptors for the uploaded object
            try:
                query_descriptor = calculate_obj_descriptors(mesh)
            except Exception as e:
                return {"error": f"Failed to calculate descriptors: {str(e)}"}, 500

            # Fetch all descriptors from MongoDB
            try:
                descriptors2 = list(collection.find({}, {"_id": 0}))  # Exclude _id field
            except Exception as e:
                return {"error": f"Failed to fetch descriptors from database: {str(e)}"}, 500

            # Default weights for Fourier coefficients and Zernike moments
            w1, w2 = 0.5, 0.5

            # Perform the search using the simple_search function
            try:
                top_similar = simple_search(
                    img_descriptor=query_descriptor,
                    descriptors2=descriptors2,
                    top_n=5, w1=w1, w2=w2
                )
            except Exception as e:
                return {"error": f"Failed to perform search: {str(e)}"}, 500

            # Return the results
            return {"results": top_similar}, 200

        except Exception as e:
            return {"error": f"Unexpected server error: {str(e)}"}, 500


class ObjModel:
    def __init__(self, vertices=None, faces=None, normals=None, textures=None):
        self.vertices = vertices or []  # List of tuples (x, y, z)
        self.faces = faces or []  # List of faces (vertex indices)
        self.normals = normals or []  # List of normals
        self.textures = textures or []  # List of texture coordinates

    def load(self, filename):
        with open(filename, 'r') as file:
            for line in file:
                parts = line.split()
                if not parts:
                    continue
                if parts[0] == 'v':
                    self.vertices.append(tuple(map(float, parts[1:4])))
                elif parts[0] == 'f':
                    self.faces.append([int(i.split('/')[0]) - 1 for i in parts[1:]])
                elif parts[0] == 'vn':
                    self.normals.append(tuple(map(float, parts[1:4])))
                elif parts[0] == 'vt':
                    self.textures.append(tuple(map(float, parts[1:3])))


def edge_collapse(model, threshold=0.1):
    vertices = np.array(model.vertices)
    edges = {}

    # Identify edges
    for face in model.faces:
        for i in range(len(face)):
            v1, v2 = sorted((face[i], face[(i + 1) % len(face)]))
            edges[(v1, v2)] = np.linalg.norm(vertices[v1] - vertices[v2])

    # Sort edges by length
    sorted_edges = sorted(edges.items(), key=lambda x: x[1])

    # Collapse edges
    collapsed = set()
    for (v1, v2), length in sorted_edges:
        if length > threshold:
            break
        if v1 in collapsed or v2 in collapsed:
            continue

        # Collapse edge
        vertices[v1] = (vertices[v1] + vertices[v2]) / 2
        collapsed.add(v2)

    # Update faces
    new_faces = []
    for face in model.faces:
        new_face = [v for v in face if v not in collapsed]
        if len(new_face) == 3:  # Keep only valid triangles
            new_faces.append(new_face)

    return ObjModel(vertices.tolist(), new_faces, model.normals, model.textures)


class TransformService(Resource):
    def post(self):
        if 'object' not in request.files:
            return {"message": "No object provided"}, 400

        uploaded_file = request.files['object']
        if uploaded_file.filename == '':
            return {"message": "No file selected for upload"}, 400

        # Save the uploaded object temporarily
        input_path = os.path.join(UPLOAD_FOLDER, secure_filename(uploaded_file.filename))
        uploaded_file.save(input_path)

        reduction_rate = request.form.get('reduction_rate', type=float)
        if not reduction_rate:
            return {"message": "Reduction rate is required and must be a float"}, 400

        try:
            # Load the model
            model = ObjModel()
            model.load(input_path)

            simplified_model = edge_collapse(model, reduction_rate)

            # Save the simplified model
            output_filename = os.path.join(TRANSFORM_FOLDER, secure_filename('transformed_obj.obj'))
            output_path = self.save_model(simplified_model, output_filename)

        except Exception as e:
            return {"message": f"Error during transformation: {str(e)}"}, 500
        finally:
            os.remove(input_path)

        return {
            "message": "Transformation successful",
            "transformed_obj_path": output_path,
        }

    def save_model(self, model, filename):
        output_path = os.path.join(os.getcwd(), filename)
        with open(output_path, 'w') as f:
            f.write(self.obj_to_str(model))
        return output_path

    def obj_to_str(self, model):
        obj_lines = []

        # Add vertices
        for vertex in model.vertices:
            obj_lines.append(f"v {' '.join(map(str, vertex))}")

        # Add faces
        for face in model.faces:
            obj_lines.append(f"f {' '.join(str(v + 1) for v in face)}")

        # Optionally add normals and textures
        for normal in model.normals:
            obj_lines.append(f"vn {' '.join(map(str, normal))}")
        for texture in model.textures:
            obj_lines.append(f"vt {' '.join(map(str, texture))}")

        return '\n'.join(obj_lines)


# Register API Endpoints
api.add_resource(DescriptorService, '/calculate-descriptors')
api.add_resource(SearchService, '/search')
api.add_resource(TransformService, '/transform')

if __name__ == '__main__':
    app.run(debug=True)
