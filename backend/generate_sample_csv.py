
import csv
import random

# Define the category structure
categories = {
    "ENGAGEMENT RINGS": [f"Rings {i}" for i in range(1, 11)],
    "DIAMOND JEWELLERY": [f"Diamond {i}" for i in range(1, 11)],
    "WEDDING RINGS": [f"Wedding {i}" for i in range(1, 11)],
    "GOLD JEWELLERY": [f"Gold {i}" for i in range(1, 11)],
    "SILVER JEWELLERY": [f"Silver {i}" for i in range(1, 11)],
}

header = [
    "sl_no", "sku", "name", "category", "subcategory", "description", "tags",
    "sellingPrice", "netPrice", "costGold", "costStone", "costMaking", "costOther",
    "stockQuantity", "lowStockThreshold", "metal", "purity", "grossWeight",
    "netWeight", "stoneWeight", "stoneType", "stoneQuality", "hsnCode", "barcode", "status"
]

rows = []
sl_no = 1

for category, subcategories in categories.items():
    for subcat in subcategories:
        for i in range(1, 4):
            # Format: "Subcategory - pX"
            name = f"{subcat} - p{i}"
            sku = f"SKU-{sl_no:04d}"
            
            # Randomize some data for realism
            price = random.randint(5000, 500000)
            stock = random.randint(0, 20)
            
            row = {
                "sl_no": sl_no,
                "sku": sku,
                "name": name,
                "category": category,
                "subcategory": subcat,
                "description": f"Beautiful {name} in {category}",
                "tags": "new,trend",
                "sellingPrice": price,
                "netPrice": int(price * 0.8),
                "costGold": int(price * 0.4),
                "costStone": int(price * 0.2),
                "costMaking": int(price * 0.1),
                "costOther": int(price * 0.1),
                "stockQuantity": stock,
                "lowStockThreshold": 2,
                "metal": "Gold" if "GOLD" in category else "Silver" if "SILVER" in category else "Platinum",
                "purity": "18K",
                "grossWeight": 5.5,
                "netWeight": 5.0,
                "stoneWeight": 0.5,
                "stoneType": "Diamond" if "DIAMOND" in category or "RINGS" in category else "None",
                "stoneQuality": "VVS" if "DIAMOND" in category else "",
                "hsnCode": "7113",
                "barcode": f"890{sl_no:05d}",
                "status": "active"
            }
            rows.append(row)
            sl_no += 1

# Write to CSV
file_path = "../sample_products.csv"  # Relative to backend dir where we run script
with open(file_path, "w", newline="") as f:
    writer = csv.DictWriter(f, fieldnames=header)
    writer.writeheader()
    writer.writerows(rows)

print(f"Successfully generated {len(rows)} products in {file_path}")
