
import asyncio
from sqlalchemy import select, func
from database import async_session_maker
from db_models import ProductDB

async def check_duplicates():
    async with async_session_maker() as db:
        # Find names with count > 1
        subquery = select(ProductDB.name, func.count(ProductDB.id).label('count'))\
            .group_by(ProductDB.name)\
            .having(func.count(ProductDB.id) > 1)
            
        result = await db.execute(subquery)
        duplicates = result.all()
        
        print(f"Found {len(duplicates)} duplicate names:")
        for name, count in duplicates:
            print(f"- '{name}': {count} entries")
            
            # Get IDs for these duplicates
            ids_res = await db.execute(select(ProductDB.id, ProductDB.stock_quantity).where(ProductDB.name == name))
            for pid, stock in ids_res:
                print(f"  ID: {pid}, Stock: {stock}")

if __name__ == "__main__":
    asyncio.run(check_duplicates())
