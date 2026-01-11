import asyncio
import json
import os
import random
from datetime import datetime, timezone, timedelta
from pathlib import Path
import uuid
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'test_database')
MAPPING_FILE = Path("image_url_mapping.json")

# Categories matching navigation
CATEGORIES = {
    "Engagement Rings": {
        "subcategories": ["Solitaire", "Halo", "Three Stone", "Vintage"],
        "base_gold_weight": (3.0, 6.0),
        "base_stone_weight": (0.5, 2.5),
    },
    "Diamond Jewellery": {
        "subcategories": ["Eternity Rings", "Dress Rings", "Pendants", "Bracelets", "Earrings"],
        "base_gold_weight": (2.0, 8.0),
        "base_stone_weight": (0.3, 1.5),
    },
    "Wedding Rings": {
        "subcategories": ["Diamond Bands", "Plain Bands", "Platinum Rings"],
        "base_gold_weight": (4.0, 8.0),
        "base_stone_weight": (0.0, 0.5),
    },
    "Gold Jewellery": {
        "subcategories": ["Pendants", "Bracelets", "Bangles", "Earrings", "Chains", "Necklets"],
        "base_gold_weight": (5.0, 25.0),
        "base_stone_weight": (0.0, 0.2),
    },
    "Silver Jewellery": {
        "subcategories": ["Rings", "Pendants", "Bracelets", "Earrings"],
        "base_gold_weight": (8.0, 30.0),
        "base_stone_weight": (0.0, 0.1),
    }
}

METALS = {
    "18K Yellow Gold": {"purity": "18K", "rate_per_gram": 5800},
    "18K White Gold": {"purity": "18K", "rate_per_gram": 5900},
    "22K Yellow Gold": {"purity": "22K", "rate_per_gram": 6500},
    "Platinum": {"purity": "PT950", "rate_per_gram": 3200},
    "Sterling Silver": {"purity": "925", "rate_per_gram": 85},
}

STONES = {
    "Lab Grown Diamond": {"rate_per_carat": 25000, "qualities": ["VS1/E", "VS1/F", "VS2/G", "VVS1/D"]},
    "Natural Diamond": {"rate_per_carat": 85000, "qualities": ["VS1/E", "VS1/F", "SI1/G", "VVS2/E"]},
    "Sapphire": {"rate_per_carat": 15000, "qualities": ["AAA", "AA", "A"]},
    "Emerald": {"rate_per_carat": 20000, "qualities": ["AAA", "AA", "A"]},
    "Ruby": {"rate_per_carat": 18000, "qualities": ["AAA", "AA", "A"]},
    "Pearl": {"rate_per_carat": 5000, "qualities": ["AAA", "AA", "A"]},
}

VENDORS = [
    {"id": "v1", "name": "Shree Gold Suppliers", "lead_time": 7},
    {"id": "v2", "name": "Diamond World India", "lead_time": 14},
    {"id": "v3", "name": "Silver Craft India", "lead_time": 5},
    {"id": "v4", "name": "Gemstone Palace", "lead_time": 10},
]


def generate_barcode():
    """Generate EAN-13 style barcode"""
    return f"890{random.randint(1000000000, 9999999999)}"


def generate_certification(stone_type):
    """Generate certification number"""
    if "Diamond" in stone_type:
        prefixes = ["IGI", "GIA", "HRD", "SGL"]
        return f"{random.choice(prefixes)}-{random.randint(10000000, 99999999)}"
    return None


def generate_product(image_url, category_name, index):
    """Generate a complete product with all fields for production use"""
    category_info = CATEGORIES[category_name]
    subcategory = random.choice(category_info["subcategories"])
    
    # Determine metal based on category
    if "Silver" in category_name:
        metal_name = "Sterling Silver"
    elif "Gold" in category_name or "Wedding" in category_name:
        metal_name = random.choice(["18K Yellow Gold", "18K White Gold", "22K Yellow Gold"])
    else:
        metal_name = random.choice(["18K Yellow Gold", "18K White Gold", "Platinum"])
    
    metal = METALS[metal_name]
    
    # Weights
    gross_weight = round(random.uniform(*category_info["base_gold_weight"]), 2)
    stone_weight = round(random.uniform(*category_info["base_stone_weight"]), 2)
    net_weight = round(gross_weight - (stone_weight * 0.2), 2)
    
    # Stone
    if stone_weight > 0:
        stone_type = random.choice(list(STONES.keys()))
        stone = STONES[stone_type]
        stone_quality = random.choice(stone["qualities"])
        certification = generate_certification(stone_type)
    else:
        stone_type = None
        stone = {"rate_per_carat": 0}
        stone_quality = None
        certification = None
    
    # Cost calculations
    cost_gold = round(net_weight * metal["rate_per_gram"], 2)
    cost_stone = round(stone_weight * stone["rate_per_carat"], 2)
    
    # Making charges
    making_charge_type = random.choice(["per_gram", "fixed"])
    if making_charge_type == "per_gram":
        making_charge_value = random.randint(1500, 3000)
        cost_making = round(net_weight * making_charge_value, 2)
    else:
        making_charge_value = random.randint(5000, 15000)
        cost_making = making_charge_value
    
    cost_other = round(random.uniform(500, 2000), 2)
    total_cost = round(cost_gold + cost_stone + cost_making + cost_other, 2)
    
    # Selling price with margin
    margin_percent = random.uniform(15, 35)
    selling_price = round(total_cost * (1 + margin_percent / 100), 0)
    profit_margin = round(selling_price - total_cost, 2)
    
    # Vendor
    vendor = random.choice(VENDORS)
    
    # Stock
    stock_quantity = random.randint(1, 10)
    low_stock_threshold = 2
    
    # Generate SKU and barcode
    cat_code = category_name[:3].upper()
    sku = f"ANY-{cat_code}-{index:04d}"
    barcode = generate_barcode()
    
    # Generate name
    if stone_type:
        carat = f"{stone_weight:.2f}ct"
        cut = random.choice(["Oval", "Round", "Emerald", "Pear", "Cushion"])
        name = f"{carat} {cut} Cut {stone_type} {subcategory} in {metal_name}"
    else:
        name = f"{metal_name} {subcategory}"
    
    product = {
        # IDENTIFICATION (POS integration)
        "id": str(uuid.uuid4()),
        "sku": sku,
        "barcode": barcode,
        "hsnCode": "7113",
        
        # BASIC INFO
        "name": name,
        "description": f"Exquisite {subcategory.lower()} crafted in {metal_name}. Perfect for marking life's most special moments.",
        "category": category_name,
        "subcategory": subcategory,
        "tags": [category_name.lower().replace(" ", "-"), subcategory.lower(), metal_name.lower().split()[0]],
        "status": "active",
        
        # IMAGES
        "image": image_url,
        "images": [image_url],
        
        # JEWELRY-SPECIFIC
        "metal": metal_name,
        "purity": metal["purity"],
        "grossWeight": gross_weight,
        "netWeight": net_weight,
        "stoneWeight": stone_weight,
        "stoneType": stone_type,
        "stoneQuality": stone_quality,
        "certification": certification,
        
        # PRICING & COSTS
        "sellingPrice": selling_price,
        "price": selling_price,  # Backward compatibility
        "currency": "INR",
        "costGold": cost_gold,
        "costStone": cost_stone,
        "costMaking": cost_making,
        "costOther": cost_other,
        "totalCost": total_cost,
        "profitMargin": profit_margin,
        "marginPercent": round(margin_percent, 1),
        
        # Legacy field names for compatibility
        "cost_gold": cost_gold,
        "cost_stone": cost_stone,
        "cost_making": cost_making,
        "cost_other": cost_other,
        "total_cost": total_cost,
        "profit_margin": profit_margin,
        "margin_percent": round(margin_percent, 1),
        "selling_price": selling_price,
        
        # MAKING CHARGE RULES
        "makingChargeType": making_charge_type,
        "makingChargeValue": making_charge_value,
        
        # INVENTORY
        "stockQuantity": stock_quantity,
        "stock_quantity": stock_quantity,  # Legacy
        "lowStockThreshold": low_stock_threshold,
        "low_stock_threshold": low_stock_threshold,  # Legacy
        "inStock": stock_quantity > 0,
        "trackInventory": True,
        "isUniqueItem": random.random() < 0.1,
        
        # VENDOR
        "vendorId": vendor["id"],
        "vendorName": vendor["name"],
        "vendor_id": vendor["id"],  # Legacy
        "vendor_name": vendor["name"],  # Legacy
        
        # TAX
        "taxRate": 3.0,
        "isTaxable": True,
        
        # PRODUCT DISCOUNT (NEW)
        "hasDiscount": random.random() < 0.15,  # 15% of products have discounts
        "discountType": random.choice(["percent", "fixed"]),
        "discountValue": random.choice([5, 10, 15, 500, 1000, 2000]),
        "discountedPrice": selling_price,  # Will be calculated if hasDiscount
        "allowCoupons": True,  # Can coupons be applied on top?
        
        # TIMESTAMPS
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    
    # Calculate discounted price if product has discount
    if product["hasDiscount"]:
        if product["discountType"] == "percent":
            discount_amount = selling_price * (product["discountValue"] / 100)
        else:
            discount_amount = product["discountValue"]
        product["discountedPrice"] = round(selling_price - discount_amount, 0)
        product["allowCoupons"] = random.random() > 0.3  # 70% allow coupons
    
    return product


async def seed_database():
    """Seed database with production-ready data"""
    if not MAPPING_FILE.exists():
        print(f"Error: {MAPPING_FILE} not found. Please run upload_images.py first.")
        return

    print("Connecting to MongoDB...")
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    # Clear existing products
    await db.products.delete_many({})
    print("Cleared existing products.")

    print("Reading image mapping...")
    with open(MAPPING_FILE, 'r') as f:
        image_map = json.load(f)

    products_to_insert = []
    category_list = list(CATEGORIES.keys())
    
    print(f"Generating data for {len(image_map)} images...")
    
    for i, (filename, url) in enumerate(image_map.items()):
        category = category_list[i % len(category_list)]
        product = generate_product(url, category, i + 1)
        products_to_insert.append(product)

    if products_to_insert:
        await db.products.insert_many(products_to_insert)
        print(f"Successfully seeded {len(products_to_insert)} products!")
        
        # Print sample
        sample = products_to_insert[0]
        print("\n=== Sample Product ===")
        print(f"Name: {sample['name']}")
        print(f"SKU: {sample['sku']}")
        print(f"Barcode: {sample['barcode']}")
        print(f"Category: {sample['category']}")
        print(f"Selling Price: ₹{sample['sellingPrice']:,.0f}")
        print(f"Total Cost: ₹{sample['totalCost']:,.0f}")
        print(f"Profit: ₹{sample['profitMargin']:,.0f} ({sample['marginPercent']:.1f}%)")
        print(f"Stock: {sample['stockQuantity']} units")
        if sample.get('certification'):
            print(f"Certification: {sample['certification']}")
    else:
        print("No products generated.")

    # Seed vendors if not exist
    vendor_count = await db.vendors.count_documents({})
    if vendor_count == 0:
        vendors_to_insert = [
            {
                "id": v["id"],
                "name": v["name"],
                "code": f"VND-{v['id'].upper()}",
                "leadTimeDays": v["lead_time"],
                "paymentTerms": random.choice(["NET30", "COD", "NET15"]),
                "currency": "INR",
                "isActive": True,
                "createdAt": datetime.now(timezone.utc).isoformat(),
            }
            for v in VENDORS
        ]
        await db.vendors.insert_many(vendors_to_insert)
        print(f"Seeded {len(vendors_to_insert)} vendors.")

    # Seed coupons
    coupon_count = await db.coupons.count_documents({})
    if coupon_count == 0:
        coupons_to_insert = [
            {
                "id": str(uuid.uuid4()),
                "code": "WELCOME10",
                "description": "10% off for new customers",
                "scope": "general",
                "applicableProducts": [],
                "type": "percent",
                "value": 10,
                "minOrderValue": 5000,
                "maxDiscount": 5000,
                "usageLimit": 1000,
                "usageCount": 0,
                "perCustomerLimit": 1,
                "validFrom": datetime.now(timezone.utc).isoformat(),
                "validTo": (datetime.now(timezone.utc) + timedelta(days=365)).isoformat(),
                "isActive": True,
                "createdAt": datetime.now(timezone.utc).isoformat(),
            },
            {
                "id": str(uuid.uuid4()),
                "code": "FLAT5000",
                "description": "Flat ₹5000 off on orders above ₹50000",
                "scope": "general",
                "applicableProducts": [],
                "type": "fixed",
                "value": 5000,
                "minOrderValue": 50000,
                "maxDiscount": 5000,
                "usageLimit": 500,
                "usageCount": 0,
                "perCustomerLimit": 2,
                "validFrom": datetime.now(timezone.utc).isoformat(),
                "validTo": (datetime.now(timezone.utc) + timedelta(days=90)).isoformat(),
                "isActive": True,
                "createdAt": datetime.now(timezone.utc).isoformat(),
            },
            {
                "id": str(uuid.uuid4()),
                "code": "SUMMER20",
                "description": "Summer sale - 20% off",
                "scope": "general",
                "applicableProducts": [],
                "type": "percent",
                "value": 20,
                "minOrderValue": 10000,
                "maxDiscount": 15000,
                "usageLimit": 200,
                "usageCount": 45,
                "perCustomerLimit": 1,
                "validFrom": datetime.now(timezone.utc).isoformat(),
                "validTo": (datetime.now(timezone.utc) + timedelta(days=60)).isoformat(),
                "isActive": True,
                "createdAt": datetime.now(timezone.utc).isoformat(),
            },
        ]
        await db.coupons.insert_many(coupons_to_insert)
        print(f"Seeded {len(coupons_to_insert)} coupons.")

    # Seed sample orders with channel info
    order_count = await db.orders.count_documents({})
    if order_count == 0:
        sample_products = products_to_insert[:5]
        sample_orders = []
        
        for i in range(10):
            product = sample_products[i % len(sample_products)]
            channel = "online" if i % 3 != 0 else "pos"
            
            order = {
                "id": str(uuid.uuid4()),
                "orderNumber": f"AJ-2024-{1000 + i:04d}",
                "channel": channel,
                "locationId": "loc-main" if channel == "pos" else None,
                "staffId": "staff-001" if channel == "pos" else None,
                "staffName": "Ramesh" if channel == "pos" else None,
                
                "customerId": f"cust-{i+1:03d}",
                "customerName": ["Priya Sharma", "Rahul Gupta", "Anita Reddy", "Vikram Mehta", "Sunita Patel"][i % 5],
                "customerEmail": f"customer{i+1}@example.com",
                "customerPhone": f"+91 98765 {43210 + i}",
                
                "status": ["pending", "paid", "fulfilled", "delivered"][i % 4],
                "paymentStatus": "paid" if i % 4 > 0 else "pending",
                "fulfillmentStatus": "fulfilled" if i % 4 > 1 else "unfulfilled",
                
                "items": [{
                    "productId": product["id"],
                    "sku": product["sku"],
                    "name": product["name"],
                    "quantity": 1,
                    "unitPrice": product["sellingPrice"],
                    "discount": 0,
                    "tax": round(product["sellingPrice"] * 0.03, 2),
                    "lineTotal": product["sellingPrice"],
                    "costAtSale": product["totalCost"],
                    "profitAtSale": product["profitMargin"],
                    "image": product["image"]
                }],
                
                "subtotal": product["sellingPrice"],
                "discountTotal": 0,
                "taxTotal": round(product["sellingPrice"] * 0.03, 2),
                "shippingTotal": 0 if channel == "pos" else 500,
                "grandTotal": product["sellingPrice"] + round(product["sellingPrice"] * 0.03, 2),
                "total": product["sellingPrice"],  # Legacy
                
                "couponCode": None,
                "couponDiscount": 0,
                
                "totalCost": product["totalCost"],
                "grossProfit": product["profitMargin"],
                "netProfit": product["profitMargin"],
                
                "paymentMethod": "card" if channel == "online" else random.choice(["cash", "card", "upi"]),
                
                "createdAt": (datetime.now(timezone.utc) - timedelta(days=i)).isoformat(),
            }
            sample_orders.append(order)
        
        await db.orders.insert_many(sample_orders)
        print(f"Seeded {len(sample_orders)} sample orders (online & POS).")

    client.close()


if __name__ == "__main__":
    asyncio.run(seed_database())
