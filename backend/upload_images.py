import os
import zipfile
import cloudinary
import cloudinary.uploader
import json
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configuration
CLOUDINARY_CLOUD_NAME = os.getenv("CLOUDINARY_CLOUD_NAME")
CLOUDINARY_API_KEY = os.getenv("CLOUDINARY_API_KEY")
CLOUDINARY_API_SECRET = os.getenv("CLOUDINARY_API_SECRET")

if not all([CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET]):
    print("Error: Missing Cloudinary credentials in .env")
    exit(1)

cloudinary.config(
    cloud_name=CLOUDINARY_CLOUD_NAME,
    api_key=CLOUDINARY_API_KEY,
    api_secret=CLOUDINARY_API_SECRET
)

ZIP_FILE_PATH = Path("../jew_images.zip")
EXTRACT_DIR = Path("temp_images")
MAPPING_FILE = Path("image_url_mapping.json")

def process_images():
    if not ZIP_FILE_PATH.exists():
        print(f"Error: Zip file not found at {ZIP_FILE_PATH.resolve()}")
        return

    print(f"Unzipping {ZIP_FILE_PATH}...")
    with zipfile.ZipFile(ZIP_FILE_PATH, 'r') as zip_ref:
        zip_ref.extractall(EXTRACT_DIR)

    uploaded_images = {}
    
    print("Starting upload to Cloudinary...")
    for root, dirs, files in os.walk(EXTRACT_DIR):
        for file in files:
            if file.lower().endswith(('.png', '.jpg', '.jpeg', '.gif', '.webp')):
                file_path = os.path.join(root, file)
                relative_path = os.path.relpath(file_path, EXTRACT_DIR)
                
                try:
                    print(f"Uploading {relative_path}...")
                    # Upload with the same name as public_id (without extension) to keep organized
                    public_id = os.path.splitext(relative_path)[0]
                    
                    response = cloudinary.uploader.upload(
                        file_path, 
                        public_id=public_id,
                        unique_filename=False,
                        overwrite=True
                    )
                    
                    secure_url = response['secure_url']
                    uploaded_images[file] = secure_url
                    print(f"  -> Success: {secure_url}")
                    
                except Exception as e:
                    print(f"  -> Failed to upload {relative_path}: {str(e)}")

    # Save mapping
    with open(MAPPING_FILE, 'w') as f:
        json.dump(uploaded_images, f, indent=2)
    
    print(f"\nUpload complete! detailed mapping saved to {MAPPING_FILE.resolve()}")
    
    # Cleanup temp dir? Maybe keep it for now or user can delete manually.
    print("Temporary images are in 'backend/temp_images'. You can delete this folder.")

if __name__ == "__main__":
    process_images()
