"""
Database migration script for Abandoned Carts table
"""
import asyncio
from sqlalchemy import text
from database import engine

async def run_migration():
    async with engine.begin() as conn:
        # Create abandoned_carts table
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS abandoned_carts (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                email VARCHAR(255) NOT NULL,
                user_id UUID,
                customer_name VARCHAR(200),
                phone VARCHAR(20),
                items JSONB DEFAULT '[]'::jsonb,
                cart_total NUMERIC(12, 2) DEFAULT 0,
                session_id VARCHAR(100),
                reminder_count INTEGER DEFAULT 0,
                last_reminder_at TIMESTAMPTZ,
                status VARCHAR(50) DEFAULT 'active',
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            );
        """))
        
        # Create indexes
        await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_abandoned_email ON abandoned_carts(email);"))
        await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_abandoned_user ON abandoned_carts(user_id);"))
        await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_abandoned_status ON abandoned_carts(status);"))
        await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_abandoned_updated ON abandoned_carts(updated_at);"))
        
        print("✅ Migration complete: abandoned_carts table created")

if __name__ == "__main__":
    asyncio.run(run_migration())
