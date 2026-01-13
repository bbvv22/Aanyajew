
import asyncio
from sqlalchemy import text
from database import async_session_maker

async def check_db():
    try:
        async with async_session_maker() as session:
            result = await session.execute(text("SELECT 1"))
            print(f"Database connection successful: {result.scalar()}")
    except Exception as e:
        print(f"Database connection failed: {e}")

if __name__ == "__main__":
    asyncio.run(check_db())
