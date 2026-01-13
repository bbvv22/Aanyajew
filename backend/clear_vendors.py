
import asyncio
from sqlalchemy import delete
from database import engine
from db_models import VendorDB
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import sessionmaker

async def clear_vendors():
    async_session = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )
    async with async_session() as session:
        print("Clearing all vendors...")
        await session.execute(delete(VendorDB))
        await session.commit()
        print("Vendors deleted.")

if __name__ == "__main__":
    asyncio.run(clear_vendors())
