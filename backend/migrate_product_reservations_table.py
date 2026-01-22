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
    print("🔄 Starting migration for product_reservations table...")
    
    engine = create_async_engine(DATABASE_URL)
    
    async with engine.begin() as conn:
        # Check if table exists
        result = await conn.execute(text(
            "SELECT to_regclass('public.product_reservations')"
        ))
        exists = result.scalar()
        
        if not exists:
            print("creating product_reservations table...")
            await conn.execute(text("""
                CREATE TABLE product_reservations (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    product_id UUID NOT NULL,
                    session_id VARCHAR(100) NOT NULL,
                    quantity INTEGER DEFAULT 1,
                    expires_at TIMESTAMPTZ NOT NULL,
                    created_at TIMESTAMPTZ DEFAULT NOW()
                );
                
                CREATE INDEX idx_reservation_product ON product_reservations(product_id);
                CREATE INDEX idx_reservation_session ON product_reservations(session_id);
                CREATE INDEX idx_reservation_expires ON product_reservations(expires_at);
            """))
            print("✅ Created product_reservations table")
        else:
            print("ℹ️ product_reservations table already exists")
            
    await engine.dispose()
    print("✨ Migration complete!")

if __name__ == "__main__":
    asyncio.run(migrate())
