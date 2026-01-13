import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.environ.get("DATABASE_URL")
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+asyncpg://", 1)
elif DATABASE_URL and DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

async def migrate():
    print(f"Connecting to database...")
    engine = create_async_engine(DATABASE_URL)
    
    async with engine.begin() as conn:
        print("Running migrations...")
        
        # 1. Add reserved_until to products
        try:
            await conn.execute(text("ALTER TABLE products ADD COLUMN reserved_until TIMESTAMP WITH TIME ZONE"))
            print("Added reserved_until to products")
        except Exception as e:
            print(f"Skipped reserved_until: {e}")

        # 2. Add reserved_by to products
        try:
            await conn.execute(text("ALTER TABLE products ADD COLUMN reserved_by VARCHAR(200)"))
            print("Added reserved_by to products")
        except Exception as e:
            print(f"Skipped reserved_by: {e}")

        # 3. Add idempotency_key to orders
        try:
            await conn.execute(text("ALTER TABLE orders ADD COLUMN idempotency_key VARCHAR(100)"))
            print("Added idempotency_key to orders")
        except Exception as e:
            print(f"Skipped idempotency_key: {e}")

        # 4. Add Unique Index to idempotency_key
        try:
            await conn.execute(text("CREATE UNIQUE INDEX idx_orders_idempotency ON orders (idempotency_key)"))
            print("Added index idx_orders_idempotency")
        except Exception as e:
            print(f"Skipped index idx_orders_idempotency: {e}")

    await engine.dispose()
    print("Migration complete!")

if __name__ == "__main__":
    asyncio.run(migrate())
