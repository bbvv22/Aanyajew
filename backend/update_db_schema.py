import asyncio
import os
from sqlalchemy import text
from dotenv import load_dotenv
from database import engine

# Explicitly load .env from the backend directory
env_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(env_path)

async def update_schema():
    print("Updating database schema...")
    
    commands = [
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS address VARCHAR(500);",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS city VARCHAR(100);",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS state VARCHAR(100);",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS pincode VARCHAR(20);",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'India';",
    ]
    
    async with engine.begin() as conn:
        for cmd in commands:
            try:
                print(f"Executing: {cmd}")
                await conn.execute(text(cmd))
                print("Success.")
            except Exception as e:
                print(f"Error executing {cmd}: {e}")
                # Continue with other columns just in case
    
    print("Schema update completed.")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(update_schema())
