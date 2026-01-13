
import asyncio
from sqlalchemy import select
from database import engine, get_db
from db_models import VendorDB
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import sessionmaker

async def list_vendors():
    # Manual session creation since we are script
    async_session = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )
    async with async_session() as session:
        result = await session.execute(select(VendorDB))
        vendors = result.scalars().all()
        print(f"Total Vendors in DB: {len(vendors)}")
        for v in vendors:
            print(f"- {v.name} ({v.code})")

if __name__ == "__main__":
    asyncio.run(list_vendors())
