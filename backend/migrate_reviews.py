"""
Database migration script for Reviews and Returns tables
"""
import asyncio
from sqlalchemy import text
from database import engine

async def run_migration():
    async with engine.begin() as conn:
        # Create reviews table
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS reviews (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                product_id UUID NOT NULL,
                user_id UUID NOT NULL,
                user_name VARCHAR(200),
                rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
                title VARCHAR(200),
                comment TEXT,
                is_verified_purchase BOOLEAN DEFAULT FALSE,
                is_approved BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
        """))
        
        # Create indexes for reviews
        await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id);"))
        await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_reviews_user ON reviews(user_id);"))
        await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);"))
        
        # Create return_requests table
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS return_requests (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                order_id UUID NOT NULL,
                customer_id UUID NOT NULL,
                reason VARCHAR(50) NOT NULL,
                description TEXT,
                status VARCHAR(50) DEFAULT 'pending',
                refund_amount NUMERIC(12, 2),
                admin_notes TEXT,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            );
        """))
        
        # Create indexes for return_requests
        await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_returns_order ON return_requests(order_id);"))
        await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_returns_customer ON return_requests(customer_id);"))
        await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_returns_status ON return_requests(status);"))
        
        print("✅ Migration complete: reviews and return_requests tables created")

if __name__ == "__main__":
    asyncio.run(run_migration())
