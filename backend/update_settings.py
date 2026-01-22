import asyncio
import os
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from dotenv import load_dotenv

load_dotenv()

async def update_setting():
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        print("DATABASE_URL not found")
        return

    if database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql+asyncpg://", 1)
    elif database_url.startswith("postgresql://"):
        database_url = database_url.replace("postgresql://", "postgresql+asyncpg://", 1)

    engine = create_async_engine(database_url)
    
    async with engine.begin() as conn:
        print("Updating abandoned_cart_minutes to 5...")
        # Check if row exists
        result = await conn.execute(text("SELECT key FROM admin_settings WHERE key = 'abandoned_cart_minutes'"))
        if result.first():
            await conn.execute(text("UPDATE admin_settings SET value = '5', updated_at = NOW() WHERE key = 'abandoned_cart_minutes'"))
        else:
            await conn.execute(text("INSERT INTO admin_settings (key, value, updated_at) VALUES ('abandoned_cart_minutes', '5', NOW())"))
        
        print("Update complete.")

if __name__ == "__main__":
    asyncio.run(update_setting())
