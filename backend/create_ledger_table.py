
import asyncio
from database import engine
from db_models import Base, InventoryLedgerDB

async def create_ledger_table():
    async with engine.begin() as conn:
        print("Creating table 'inventory_ledger'...")
        await conn.run_sync(Base.metadata.create_all)
        print("Table created successfully.")

if __name__ == "__main__":
    asyncio.run(create_ledger_table())
