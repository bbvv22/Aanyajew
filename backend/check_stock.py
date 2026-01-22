import asyncio
from database import async_session_maker
from db_models import ProductDB
from sqlalchemy import select

async def list_stock():
    async with async_session_maker() as db:
        print("\n📦 Generating Stock Report...")
        result = await db.execute(select(ProductDB).order_by(ProductDB.name))
        products = result.scalars().all()
        
        with open("stock_report.md", "w") as f:
            f.write("# 📦 Full Inventory Stock Report\n\n")
            f.write(f"**Generated at:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
            f.write("| Product Name | Stock | Status | ID |\n")
            f.write("| :--- | :--- | :--- | :--- |\n")
            
            for p in products:
                status = "✅ Active" if p.status == 'active' else "❌ Inactive"
                f.write(f"| {p.name} | **{p.stock_quantity}** | {status} | `{p.id}` |\n")
                
        print(f"✅ Report saved to stock_report.md ({len(products)} products)")

if __name__ == "__main__":
    from datetime import datetime
    asyncio.run(list_stock())
