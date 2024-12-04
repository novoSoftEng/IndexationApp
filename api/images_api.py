from flask import Flask, request, send_file, jsonify
from flask_restful import Resource, Api, reqparse
import os
from werkzeug.utils import secure_filename
from PIL import Image

# Create Flask app and API
app = Flask(__name__)
api = Api(app)

# Directory to store uploaded images
UPLOAD_FOLDER = '../uploaded_images'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

# Set maximum upload size (optional)
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16 MB

# Helper function to list images in the directory
def list_images():
    return [f for f in os.listdir(UPLOAD_FOLDER) if os.path.isfile(os.path.join(UPLOAD_FOLDER, f))]

# API Resources
class ImageUpload(Resource):
    def post(self):
        """Upload a single or multiple images."""
        if 'images' not in request.files:
            return {"message": "No images provided"}, 400

        images = request.files.getlist('images')
        uploaded_files = []
        for image in images:
            if image.filename == '':
                continue

            filename = secure_filename(image.filename)
            image.save(os.path.join(UPLOAD_FOLDER, filename))
            uploaded_files.append(filename)

        return {"message": "Images uploaded successfully", "files": uploaded_files}, 201


class ImageDownload(Resource):
    def get(self, filename=None):
        """Download a specific image or list all available images."""
        if filename:
            file_path = os.path.join(UPLOAD_FOLDER, filename)
            if not os.path.exists(file_path):
                return {"message": f"Image '{filename}' not found"}, 404
            return send_file(file_path, mimetype='image/jpeg')

        # If no specific file is requested, list all images
        images = list_images()
        return {"message": "Available images", "files": images}, 200


class ImageDelete(Resource):
    def delete(self, filename=None):
        """Delete a specific image or all images."""
        if filename:
            file_path = os.path.join(UPLOAD_FOLDER, filename)
            if not os.path.exists(file_path):
                return {"message": f"Image '{filename}' not found"}, 404

            os.remove(file_path)
            return {"message": f"Image '{filename}' deleted successfully"}, 200

        # If no specific file is provided, delete all images
        images = list_images()
        for image in images:
            os.remove(os.path.join(UPLOAD_FOLDER, image))
        return {"message": "All images deleted successfully"}, 200

# Register API Endpoints
api.add_resource(ImageUpload, '/upload')
api.add_resource(ImageDownload, '/download', '/download/<string:filename>')
api.add_resource(ImageDelete, '/delete', '/delete/<string:filename>')

if __name__ == '__main__':
    app.run(debug=True)
