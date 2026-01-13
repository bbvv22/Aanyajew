
import asyncio
import os
from sqlalchemy.future import select
from database import async_session_maker
from db_models import ProductDB, OrderDB

async def verify_stock():
    async with async_session_maker() as session:
        # 1. Fetch Products
        result = await session.execute(select(ProductDB).limit(5))
        products = result.scalars().all()
        
        print(f"Found {len(products)} products in database.")
        
        # 2. Calculate Reserved
        reserved_map = {}
        result_orders = await session.execute(select(OrderDB).where(OrderDB.status.in_(['pending', 'processing'])))
        active_orders = result_orders.scalars().all()
        
        print(f"Found {len(active_orders)} active orders (pending/processing).")
        
        for order in active_orders:
            if order.items:
                for item in order.items:
                    pid = item.get('id')
                    qty = int(item.get('quantity', 0))
                    if pid:
                        reserved_map[str(pid)] = reserved_map.get(str(pid), 0) + qty

        # 3. Print Details
        print("\nStock Details (First 5):")
        print("-" * 60)
        print(f"{'Name':<30} | {'Stock':<10} | {'Reserved':<10} | {'Available':<10}")
        print("-" * 60)
        
        for p in products:
            reserved = reserved_map.get(str(p.id), 0)
            available = p.stock_quantity
            print(f"{p.name[:28]:<30} | {available:<10} | {reserved:<10} | {available:<10}")

if __name__ == "__main__":
    asyncio.run(verify_stock())
