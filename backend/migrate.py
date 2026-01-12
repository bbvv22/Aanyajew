"""
Database migration script to create all tables in PostgreSQL
Run this to initialize the database
"""
import asyncio
import os
from dotenv import load_dotenv

load_dotenv()

async def main():
    """Create all database tables"""
    # Import models first so they register with Base
    import db_models  # noqa: F401
    from database import create_tables, engine
    
    print("🔧 Creating database tables...")
    
    try:
        await create_tables()
        print("✅ All tables created successfully!")
        
        # Print table names
        from sqlalchemy import inspect
        async with engine.connect() as conn:
            result = await conn.run_sync(lambda sync_conn: inspect(sync_conn).get_table_names())
            print(f"\n📋 Created {len(result)} tables:")
            for table in sorted(result):
                print(f"   - {table}")
                
    except Exception as e:
        print(f"❌ Error creating tables: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(main())
