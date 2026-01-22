import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("❌ DATABASE_URL not found in environment variables")
    exit(1)

# Ensure async driver is used
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

async def migrate():
    print("🔄 Starting migration for admin_settings table...")
    
    engine = create_async_engine(DATABASE_URL)
    
    async with engine.begin() as conn:
        # Check if table exists
        result = await conn.execute(text(
            "SELECT to_regclass('public.admin_settings')"
        ))
        exists = result.scalar()
        
        if not exists:
            print("creating admin_settings table...")
            await conn.execute(text("""
                CREATE TABLE admin_settings (
                    key VARCHAR(100) PRIMARY KEY,
                    value VARCHAR NOT NULL,
                    updated_at TIMESTAMPTZ DEFAULT NOW()
                );
            """))
            print("✅ Created admin_settings table")
        else:
            print("ℹ️ admin_settings table already exists")
            
        # Insert default value for abandoned cart timing
        await conn.execute(text("""
            INSERT INTO admin_settings (key, value)
            VALUES ('abandoned_cart_minutes', '15')
            ON CONFLICT (key) DO NOTHING;
        """))
        print("✅ Inserted default abandoned_cart_minutes = 15")
            
    await engine.dispose()
    print("✨ Migration complete!")

if __name__ == "__main__":
    asyncio.run(migrate())
