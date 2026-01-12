import asyncio
import json
import os
import random
from datetime import datetime, timezone, timedelta
from pathlib import Path
import uuid
from sqlalchemy import select, text, delete
from sqlalchemy.ext.asyncio import AsyncSession
from dotenv import load_dotenv

from database import async_session_maker, create_tables
from db_models import ProductDB, VendorDB, CouponDB, OrderDB

load_dotenv()

MAPPING_FILE = Path("image_url_mapping.json")

# Same product generation logic from MongoDB seed
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
    """Generate a complete product"""
    category_info = CATEGORIES[category_name]
    subcategory = random.choice(category_info["subcategories"])
    
    # Metal selection
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
    
    vendor = random.choice(VENDORS)
    stock_quantity = random.randint(1, 10)
    
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
    
    return ProductDB(
        id=uuid.uuid4(),
        sku=sku,
        barcode=barcode,
        hsn_code="7113",
        name=name,
        description=f"Exquisite {subcategory.lower()} crafted in {metal_name}. Perfect for marking life's most special moments.",
        category=category_name,
        subcategory=subcategory,
        tags=[category_name.lower().replace(" ", "-"), subcategory.lower(), metal_name.lower().split()[0]],
        status="active",
        image=image_url,
        images=[image_url],
        metal=metal_name,
        purity=metal["purity"],
        gross_weight=gross_weight,
        net_weight=net_weight,
        stone_weight=stone_weight,
        stone_type=stone_type,
        stone_quality=stone_quality,
        certification=certification,
        selling_price=selling_price,
        price=selling_price,
        currency="INR",
        cost_gold=cost_gold,
        cost_stone=cost_stone,
        cost_making=cost_making,
        cost_other=cost_other,
        total_cost=total_cost,
        profit_margin=profit_margin,
        margin_percent=round(margin_percent, 1),
        making_charge_type=making_charge_type,
        making_charge_value=making_charge_value,
        stock_quantity=stock_quantity,
        low_stock_threshold=2,
        in_stock=stock_quantity > 0,
        track_inventory=True,
        is_unique_item=random.random() < 0.1,
        vendor_id=vendor["id"],
        vendor_name=vendor["name"],
        tax_rate=3.0,
        is_taxable=True,
        has_discount=random.random() < 0.15,
        discount_type=random.choice(["percent", "fixed"]),
        discount_value=random.choice([5, 10, 15, 500, 1000, 2000]),
        discounted_price=selling_price,
        allow_coupons=True,
    )


async def seed_database():
    """Seed database with production-ready data"""
    if not MAPPING_FILE.exists():
        print(f"❌ Error: {MAPPING_FILE} not found.")
        return

    print("📦 Creating database tables...")
    await create_tables()
    
    print("🔗 Connecting to PostgreSQL...")
    
    async with async_session_maker() as session:
        # Clear existing products
        await session.execute(delete(ProductDB))
        await session.commit()
        print("✅ Cleared existing products.")

        print("📖 Reading image mapping...")
        with open(MAPPING_FILE, 'r') as f:
            image_map = json.load(f)

        products = []
        category_list = list(CATEGORIES.keys())
        
        print(f"🎨 Generating data for {len(image_map)} images...")
        
        for i, (filename, url) in enumerate(image_map.items()):
            category = category_list[i % len(category_list)]
            product = generate_product(url, category, i + 1)
            products.append(product)

        if products:
            session.add_all(products)
            await session.commit()
            print(f"✅ Successfully seeded {len(products)} products!")
            
            # Print sample
            sample = products[0]
            print("\n=== Sample Product ===")
            print(f"Name: {sample.name}")
            print(f"SKU: {sample.sku}")
            print(f"Barcode: {sample.barcode}")
            print(f"Category: {sample.category}")
            print(f"Selling Price: ₹{sample.selling_price:,.0f}")
            print(f"Total Cost: ₹{sample.total_cost:,.0f}")
            print(f"Profit: ₹{sample.profit_margin:,.0f} ({sample.margin_percent:.1f}%)")
            print(f"Stock: {sample.stock_quantity} units")
            if sample.certification:
                print(f"Certification: {sample.certification}")

        # Seed vendors
        vendors = [
            VendorDB(
                id=v["id"],
                name=v["name"],
                code=f"VND-{v['id'].upper()}",
                lead_time_days=v["lead_time"],
                payment_terms=random.choice(["NET30", "COD", "NET15"]),
                currency="INR",
                is_active=True,
            )
            for v in VENDORS
        ]
        session.add_all(vendors)
        await session.commit()
        print(f"✅ Seeded {len(vendors)} vendors.")

        # Seed coupons
        coupons = [
            CouponDB(
                id=uuid.uuid4(),
                code="WELCOME10",
                description="10% off for new customers",
                scope="general",
                applicable_products=[],
                type="percent",
                value=10,
                min_order_value=5000,
                max_discount=5000,
                usage_limit=1000,
                usage_count=0,
                per_customer_limit=1,
                valid_from=datetime.now(timezone.utc),
                valid_to=datetime.now(timezone.utc) + timedelta(days=365),
                is_active=True,
            ),
            CouponDB(
                id=uuid.uuid4(),
                code="FLAT5000",
                description="Flat ₹5000 off on orders above ₹50000",
                scope="general",
                applicable_products=[],
                type="fixed",
                value=5000,
                min_order_value=50000,
                max_discount=5000,
                usage_limit=500,
                usage_count=0,
                per_customer_limit=2,
                valid_from=datetime.now(timezone.utc),
                valid_to=datetime.now(timezone.utc) + timedelta(days=90),
                is_active=True,
            ),
        ]
        session.add_all(coupons)
        await session.commit()
        print(f"✅ Seeded {len(coupons)} coupons.")

    print("\n🎉 Database seeding complete!")


if __name__ == "__main__":
    asyncio.run(seed_database())
