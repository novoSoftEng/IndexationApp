import os
import cv2
import numpy as np
from flask import Flask, request, jsonify, Response
from flask_restful import Api, Resource
from werkzeug.utils import secure_filename


# Directory to store uploaded images
UPLOAD_FOLDER = '../uploaded_images'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

app = Flask(__name__)
api = Api(app)

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

            if image is None:
                results[image_file.filename] = {"error": "Invalid image format"}
                continue

            # Calculate descriptors
            color_histogram = calculate_color_histogram(image)
            dominant_colors = calculate_dominant_colors(image)
            texture_descriptors = calculate_texture_descriptors(image)  # Should use Gabor filters
            hu_moments = calculate_hu_moments(image)
            average_color = calculate_average_color(image)  # New color descriptor
            edge_histogram = calculate_edge_histogram(image)  # New texture/shape descriptor

            # Store results
            results[image_file.filename] = {
                "color_histogram": color_histogram,
                "dominant_colors": dominant_colors,
                "texture_descriptors": texture_descriptors,
                "hu_moments": hu_moments,
                "average_color": average_color,
                "edge_histogram": edge_histogram,
            }

        return jsonify({"message": "Descriptors calculated", "results": results})

# Register API Endpoints
api.add_resource(DescriptorService, '/calculate-descriptors')
api.add_resource(TransformService, '/transform')
if __name__ == '__main__':
    app.run(debug=True)

