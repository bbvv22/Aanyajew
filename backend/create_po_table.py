
import asyncio
from database import engine, Base
from db_models import PurchaseOrderDB

async def create_table():
    async with engine.begin() as conn:
        print("Creating purchase_orders table...")
        await conn.run_sync(Base.metadata.create_all)
        print("Done.")

if __name__ == "__main__":
    asyncio.run(create_table())
