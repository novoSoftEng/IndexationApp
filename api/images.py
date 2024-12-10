import os
import cv2
import numpy as np
from flask import Flask, request, jsonify, Response
from pymongo import MongoClient
from flask_restful import Api, Resource
from rich import _console
from werkzeug.utils import secure_filename
from scipy.spatial.distance import euclidean
from dotenv import load_dotenv
from flask_cors import CORS
import random
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


def transform_image(image_path, crop_coords=None, resize_dims=None, flip=None, rotate_angle=None):
    """
    Transform an image using cropping, resizing, flipping, and rotation.

    :param image_path: Path to the input image.
    :param crop_coords: Tuple (x, y, w, h) for cropping (x, y are the top-left corner, w is width, h is height).
    :param resize_dims: Tuple (width, height) for resizing.
    :param flip: Integer indicating flip mode (0 for vertical, 1 for horizontal, -1 for both axes).
    :param rotate_angle: Angle in degrees to rotate the image.
    :return: Transformed image as binary data.
    """
    # Load the image
    image = cv2.imread(image_path)
    if image is None:
        raise FileNotFoundError(f"Image not found at {image_path}")

    # Crop the image
    if crop_coords:
        x, y, w, h = crop_coords
        image = image[y:y+h, x:x+w]

    # Resize the image
    if resize_dims:
        image = cv2.resize(image, resize_dims, interpolation=cv2.INTER_LINEAR)

    # Flip the image
    if flip is not None:
        image = cv2.flip(image, flip)

    # Rotate the image
    if rotate_angle:
        (h, w) = image.shape[:2]
        center = (w // 2, h // 2)
        rotation_matrix = cv2.getRotationMatrix2D(center, rotate_angle, 1.0)
        image = cv2.warpAffine(image, rotation_matrix, (w, h))

    # Encode the image as a JPEG in memory
    _, buffer = cv2.imencode('.jpg', image)

    # Return the binary data
    return buffer.tobytes()


# Helper functions to calculate descriptors
def calculate_color_histogram(image):
    """Calculate color histogram for an image."""
    histogram = []
    for i in range(3):  # Loop over color channels (B, G, R)
        hist = cv2.calcHist([image], [i], None, [256], [0, 256])
        histogram.append(hist.flatten().tolist())
    return histogram

def calculate_dominant_colors(image, k=3):
    """Calculate dominant colors using k-means clustering."""
    image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    pixels = image.reshape((-1, 3))
    pixels = np.float32(pixels)

    criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 100, 0.2)
    _, labels, centers = cv2.kmeans(pixels, k, None, criteria, 10, cv2.KMEANS_RANDOM_CENTERS)

    centers = np.uint8(centers)
    counts = np.bincount(labels.flatten())

    dominant_colors = [centers[i].tolist() for i in np.argsort(-counts)]
    return dominant_colors

def calculate_texture_descriptors(image):
    """Calculate texture descriptors using Gabor filters."""
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    gabor_filters = []
    for theta in [0, np.pi / 4, np.pi / 2, 3 * np.pi / 4]:
        kernel = cv2.getGaborKernel((21, 21), 5.0, theta, 10.0, 0.5, 0, ktype=cv2.CV_32F)
        filtered = cv2.filter2D(gray, cv2.CV_8UC3, kernel)
        gabor_filters.append(np.mean(filtered))
    return gabor_filters

def calculate_hu_moments(image):
    """Calculate Hu Moments for an image."""
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    contours, _ = cv2.findContours(gray, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if contours:
        largest_contour = max(contours, key=cv2.contourArea)
        moments = cv2.moments(largest_contour)
        hu_moments = cv2.HuMoments(moments).flatten().tolist()
        return hu_moments
    return []

def calculate_average_color(image):
    average_color = cv2.mean(image)[:3]  # Excludes alpha if present
    return list(map(int, average_color))  # Convert to integers

def calculate_edge_histogram(image):
    gray_image = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(gray_image, 100, 200)  # Edge detection
    histogram = cv2.calcHist([edges], [0], None, [256], [0, 256])
    return histogram.flatten().tolist()


def calculate_img_descriptors(image):
    """Combine all descriptors into a global score."""
    color_histogram = calculate_color_histogram(image)
    dominant_colors = calculate_dominant_colors(image, k=5)
    texture_descriptors = calculate_texture_descriptors(image)
    hu_moments = calculate_hu_moments(image)
    average_color = calculate_average_color(image)
    edge_histogram = calculate_edge_histogram(image)

    return {
        "color_histogram": color_histogram,
        "dominant_colors": dominant_colors,
        "texture_descriptors": texture_descriptors,
        "hu_moments": hu_moments,
        "average_color": average_color,
        "edge_histogram": edge_histogram
    }


def simple_search(img_descriptor, descriptors2, top_n=5,  w1=0.1, w2=0.8, w3=0.1,
                  frame_weights=(0.7, 0.3), color_weights=(0.4, 0.1, 0.5)):
    """
    Finds the top N similar images to a query image based on weighted group-level distances.

    Parameters:
        img_descriptor (dict): Descriptors of the query image.
        descriptors2 (list): List of descriptors for other images. Each entry is a dictionary 
                             with keys 'filename' and 'characteristics'.
        top_n (int): Number of top similar images to return.
        w1, w2, w3 (float): Weights for frame, color, and texture groups.
        frame_weights (tuple): Weights for hu_moments and edge_histogram.
        color_weights (tuple): Weights for color_histogram, average_color, and dominant_colors.
        texture_weight (float): Weight for texture_descriptors.

    Returns:
        list: Top N similar images as dictionaries with 'filename' and 'score'.
    """
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

    return top_similar


def query_point_movement2(w1, w2, w3, frame_weights, color_weights, relevant_descriptors,
                          irrelevant_descriptors, alpha=1, beta=0.001, gamma=0.001):
    """
    Update weights based on user feedback using relevant and irrelevant descriptors.

    Parameters:
        w1, w2, w3: Current weights for frame, color, and texture groups.
        frame_weights (tuple): Current weights for hu_moments and edge_histogram.
        color_weights (tuple): Current weights for color_histogram, average_color, and dominant_colors.
        # texture_weight (float): Current weight for texture_descriptors.
        relevant_descriptors: List of descriptors for relevant images.
        irrelevant_descriptors: List of descriptors for irrelevant images.
        alpha: Weight increment for relevance feedback.
        beta: Weight increment for relevance feedback.
        gamma: Weight decrement for irrelevance feedback.

    Returns:
        Updated weights (w1, w2, w3, frame_weights, color_weights, texture_weight).
    """
    # print('input : ',w1, w2, w3, frame_weights, color_weights)
    # Calculate group-level feedback scores for relevant and irrelevant images
    relevant_frame_score = sum([
        frame_weights[0] * np.linalg.norm(d['characteristics']["hu_moments"]) +
        frame_weights[1] * np.linalg.norm(d['characteristics']["edge_histogram"])
        for d in relevant_descriptors
    ]) / len(relevant_descriptors)

    relevant_color_score = sum([
        color_weights[0] * np.linalg.norm(np.ravel(d['characteristics']["color_histogram"])) +
        color_weights[1] * np.linalg.norm(np.ravel(d['characteristics']["average_color"])) +
        color_weights[2] * np.linalg.norm(np.ravel(d['characteristics']["dominant_colors"]))
        for d in relevant_descriptors
    ]) / len(relevant_descriptors)

    relevant_texture_score = sum([np.linalg.norm(d['characteristics']["texture_descriptors"]) for d in relevant_descriptors]) / len(relevant_descriptors)

    irrelevant_frame_score = sum([
        frame_weights[0] * np.linalg.norm(d['characteristics']["hu_moments"]) +
        frame_weights[1] * np.linalg.norm(d['characteristics']["edge_histogram"])
        for d in irrelevant_descriptors
    ]) / len(irrelevant_descriptors)

    irrelevant_color_score = sum([
        color_weights[0] * np.linalg.norm(np.ravel(d['characteristics']["color_histogram"])) +
        color_weights[1] * np.linalg.norm(np.ravel(d['characteristics']["average_color"])) +
        color_weights[2] * np.linalg.norm(np.ravel(d['characteristics']["dominant_colors"]))
        for d in irrelevant_descriptors
    ]) / len(irrelevant_descriptors)

    irrelevant_texture_score = sum([np.linalg.norm(d['characteristics']["texture_descriptors"]) for d in irrelevant_descriptors]) / len(irrelevant_descriptors)

    # Update group weights
    w1_new = alpha * w1 + beta * relevant_frame_score - gamma * irrelevant_frame_score
    w2_new = alpha * w2 + beta * relevant_color_score - gamma * irrelevant_color_score
    w3_new = alpha * w3 + beta * relevant_texture_score - gamma * irrelevant_texture_score

    # Update frame weights
    frame_weights_new = (
        alpha * frame_weights[0] + beta * sum([
            np.linalg.norm(d['characteristics']["hu_moments"]) for d in relevant_descriptors
        ]) / len(relevant_descriptors) - 
        gamma * sum([
            np.linalg.norm(d['characteristics']["hu_moments"]) for d in irrelevant_descriptors
        ]) / len(irrelevant_descriptors),

        alpha * frame_weights[1] + beta * sum([
            np.linalg.norm(d['characteristics']["edge_histogram"]) for d in relevant_descriptors
        ]) / len(relevant_descriptors) -
        gamma * sum([
            np.linalg.norm(d['characteristics']["edge_histogram"]) for d in irrelevant_descriptors
        ]) / len(irrelevant_descriptors)
    )

    # Update color weights
    color_weights_new = (
        alpha * color_weights[0] + beta * sum([
            np.linalg.norm(np.ravel(d['characteristics']["color_histogram"])) for d in relevant_descriptors
        ]) / len(relevant_descriptors) -
        gamma * sum([
            np.linalg.norm(np.ravel(d['characteristics']["color_histogram"])) for d in irrelevant_descriptors
        ]) / len(irrelevant_descriptors),

        alpha * color_weights[1] + beta * sum([
            np.linalg.norm(np.ravel(d['characteristics']["average_color"])) for d in relevant_descriptors
        ]) / len(relevant_descriptors) -
        gamma * sum([
            np.linalg.norm(np.ravel(d['characteristics']["average_color"])) for d in irrelevant_descriptors
        ]) / len(irrelevant_descriptors),

        alpha * color_weights[2] + beta * sum([
            np.linalg.norm(np.ravel(d['characteristics']["dominant_colors"])) for d in relevant_descriptors
        ]) / len(relevant_descriptors) -
        gamma * sum([
            np.linalg.norm(np.ravel(d['characteristics']["dominant_colors"])) for d in irrelevant_descriptors
        ]) / len(irrelevant_descriptors)
    )

    # # Normalize weights to ensure their sum is 1 (optional)
    # total_weight = w1_new + w2_new + w3_new
    # w1_new /= total_weight
    # w2_new /= total_weight
    # w3_new /= total_weight
    
    # print('output : ', w1_new, w2_new, w3_new, frame_weights_new, color_weights_new)
    return w1_new, w2_new, w3_new, frame_weights_new, color_weights_new


# Resource classes for API
class TransformService(Resource):
    def post(self):
        """
        Apply transformations to an uploaded image and return the result.

        Request Parameters:
        - image: The image file to be transformed (multipart/form-data).
        - crop_coords: Optional tuple (x, y, w, h) for cropping.
        - resize_dims: Optional tuple (width, height) for resizing.
        - flip: Optional integer for flipping (0: vertical, 1: horizontal, -1: both).
        - rotate_angle: Optional angle in degrees for rotation.

        Response:
        - The transformed image as a binary file.
        """
        if 'image' not in request.files:
            return {"message": "No image provided"}, 400

        image_file = request.files['image']
        if image_file.filename == '':
            return {"message": "No file selected for upload"}, 400

        # Save uploaded image temporarily
        input_path = os.path.join(UPLOAD_FOLDER, secure_filename(image_file.filename))
        image_file.save(input_path)

        # Parse transformation parameters
        crop_coords = request.form.get('crop_coords')
        if crop_coords:
            crop_coords = tuple(map(int, crop_coords.split(',')))

        resize_dims = request.form.get('resize_dims')
        if resize_dims:
            resize_dims = tuple(map(int, resize_dims.split(',')))

        flip = request.form.get('flip')
        if flip:
            flip = int(flip)

        rotate_angle = request.form.get('rotate_angle')
        if rotate_angle:
            rotate_angle = float(rotate_angle)

        try:
            # Perform the transformation and get the binary image data
            transformed_image = transform_image(
                image_path=input_path,
                crop_coords=crop_coords,
                resize_dims=resize_dims,
                flip=flip,
                rotate_angle=rotate_angle
            )
        except Exception as e:
            return {"message": f"Error during transformation: {str(e)}"}, 500
        finally:
            # Clean up temporary file
            os.remove(input_path)

        # Return the transformed image as a response
        return Response(transformed_image, mimetype='image/jpeg')


class DescriptorService(Resource):
    def post(self):
        """Calculate descriptors for an uploaded image or set of images."""
        if 'images' not in request.files:
            return {"message": "No images provided"}, 400

        images = request.files.getlist('images')
        results = {}

        for image_file in images:
            # Read image using OpenCV
            image_bytes = np.frombuffer(image_file.read(), np.uint8)
            image = cv2.imdecode(image_bytes, cv2.IMREAD_COLOR)

            # Convert the image from BGR to RGB

            if image is None:
                results[image_file.filename] = {"error": "Invalid image format"}
                continue

            # Store results
            results[image_file.filename] = calculate_img_descriptors(image)

        return jsonify({"message": "Descriptors calculated", "results": results})


class SearchService(Resource):
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
                new_weights = query_point_movement2(
                    w1, w2, w3, frame_weights, color_weights,
                    relevant_descriptors, irrelevant_descriptors,
                    alpha=1, beta=0.001, gamma=0.001
                )

                # Perform the search with recalculated weights
                top_similar = simple_search(
                    query_descriptor, descriptors2, top_n=10,
                    w1=new_weights["w1"], w2=new_weights["w2"], w3=new_weights["w3"],
                    frame_weights=new_weights["frame_weights"], color_weights=new_weights["color_weights"]
                )

                # Save new weights to the database
                w_collection.update_one(
                    {"type": "weights"},
                    {"$set": {
                        "w1": new_weights["w1"],
                        "w2": new_weights["w2"],
                        "w3": new_weights["w3"],
                        "frame_weights": new_weights["frame_weights"],
                        "color_weights": new_weights["color_weights"]
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


# Register API Endpoints
api.add_resource(DescriptorService, '/calculate-descriptors')
api.add_resource(TransformService, '/transform')
api.add_resource(SearchService, '/search')

if __name__ == '__main__':
    app.run(debug=True)
