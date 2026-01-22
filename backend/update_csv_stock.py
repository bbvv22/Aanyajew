import csv
import shutil
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FILENAME = os.path.join(BASE_DIR, "sample_products.csv")
BACKUP_FILENAME = os.path.join(BASE_DIR, "sample_products.csv.bak")

def update_stock():
    # Create backup first
    shutil.copyfile(FILENAME, BACKUP_FILENAME)
    print(f"📦 Created backup: {BACKUP_FILENAME}")
    
    updated_rows = []
    
    with open(FILENAME, 'r', newline='') as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames
        
        print("🔄 Processing rows...")
        for row in reader:
            row['stockQuantity'] = '10'
            updated_rows.append(row)
            
    with open(FILENAME, 'w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(updated_rows)
        
    print(f"✅ Successfully updated stock to 10 for {len(updated_rows)} products in {FILENAME}")

if __name__ == "__main__":
    update_stock()
