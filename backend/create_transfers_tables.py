
import asyncio
import os
from database import engine
from db_models import Base, LocationDB, TransferDB

async def create_new_tables():
    async with engine.begin() as conn:
        print("Creating tables...")
        # Create tables if they don't exist
        await conn.run_sync(Base.metadata.create_all)
        print("Tables created successfully.")
        
        # Seed default locations
        from sqlalchemy.orm import sessionmaker
        from sqlalchemy.ext.asyncio import AsyncSession
        
        # We need a session to insert data
        async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
        
        async with async_session() as session:
            # Check if locations exist
            from sqlalchemy.future import select
            result = await session.execute(select(LocationDB))
            locations = result.scalars().all()
            
            if not locations:
                print("Seeding default locations...")
                main_store = LocationDB(name="Main Store", type="store", address="123 Jewelry St")
                warehouse = LocationDB(name="Central Warehouse", type="warehouse", address="456 Industrial Park")
                session.add_all([main_store, warehouse])
                await session.commit()
                print("Default locations seeded.")
            else:
                print("Locations already exist.")

if __name__ == "__main__":
    asyncio.run(create_new_tables())
