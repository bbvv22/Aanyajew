import asyncio
import uuid
import os
from database import async_session_maker
from db_models import ProductDB
from sqlalchemy import select

TARGET_ID = "cfb8f261-c6e7-4d89-8d47-133590c6db4c"

async def debug_product_fetch():
    print(f"🔍 Debugging fetch for Product ID: {TARGET_ID}")
    
    try:
        product_uuid = uuid.UUID(TARGET_ID)
        print(f"✅ Converted to UUID: {product_uuid} (type: {type(product_uuid)})")
    except Exception as e:
        print(f"❌ UUID conversion failed: {e}")
        return

    async with async_session_maker() as db:
        try:
            # Search by NAME
            print("trying select by name 'Wedding 7 - p1'...")
            stmt = select(ProductDB).where(ProductDB.name == "Wedding 7 - p1")
            result = await db.execute(stmt)
            product = result.scalar_one_or_none()
            
            if product:
                print(f"✅ Found Product by Name: {product.name}")
                print(f"   Current ID: {product.id}")
                print(f"   Target ID:  {TARGET_ID}")
                if str(product.id) != TARGET_ID:
                    print("⚠️ ID MISMATCH! The product ID has changed.")
            else:
                print("❌ Product NOT FOUND by Name")
                
            # 2. Select For Update (Replicating server logic)
            print("trying select with_for_update()...")
            stmt = select(ProductDB).where(ProductDB.id == product_uuid).with_for_update()
            result = await db.execute(stmt)
            product = result.scalar_one_or_none()
            
            if product:
                print(f"✅ Found Product (For Update): {product.name}")
            else:
                print("❌ Product NOT FOUND (For Update)")

        except Exception as e:
            print(f"❌ Database error: {e}")

if __name__ == "__main__":
    asyncio.run(debug_product_fetch())
