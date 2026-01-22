import asyncio
import os
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from dotenv import load_dotenv

load_dotenv()

async def debug_carts():
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        print("DATABASE_URL not found")
        return

    if database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql+asyncpg://", 1)
    elif database_url.startswith("postgresql://"):
        database_url = database_url.replace("postgresql://", "postgresql+asyncpg://", 1)

    print(f"Connecting to DB...")
    engine = create_async_engine(database_url)
    
    async with engine.begin() as conn:
        print("\n--- Recent Abandoned Carts ---")
        try:
            result = await conn.execute(text("SELECT email, updated_at, reminder_count, status FROM abandoned_carts ORDER BY updated_at DESC LIMIT 5"))
            rows = result.fetchall()
            if not rows:
                print("No abandoned carts found.")
            for row in rows:
                print(f"Email: {row[0]}, Updated: {row[1]}, Count: {row[2]}, Status: {row[3]}")
                
            print("\n--- Admin Settings ---")
            result = await conn.execute(text("SELECT key, value FROM admin_settings WHERE key='abandoned_cart_minutes'"))
            setting = result.fetchone()
            print("\n--- Environment Config ---")
            mailer = os.environ.get("MAILER_URL")
            print(f"MAILER_URL: {'Set' if mailer else 'MISSING'}")
            print(f"MAILER_URL Value: {mailer[:10] if mailer else 'None'}...")
            
        except Exception as e:
            print(f"Error querying DB: {e}")
    
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(debug_carts())
