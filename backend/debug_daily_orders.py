
import asyncio
from sqlalchemy import select, func, text
from database import async_session_maker
from db_models import OrderDB
from datetime import datetime, timedelta
import pytz

async def debug_daily_stats():
    async with async_session_maker() as session:
        # Get orders from last 3 days
        stmt = select(OrderDB).where(
            OrderDB.created_at >= datetime.utcnow() - timedelta(days=3)
        ).order_by(OrderDB.created_at.desc())
        
        result = await session.execute(stmt)
        orders = result.scalars().all()
        
        print(f"{'Order ID':<10} | {'Created (UTC)':<20} | {'Created (IST)':<20} | {'Total':<10} | {'Status':<10} | {'PayStatus':<10} | {'Day (IST)'}")
        print("-" * 110)
        
        ist = pytz.timezone('Asia/Kolkata')
        
        totals = {}
        
        for o in orders:
            utc_time = o.created_at.replace(tzinfo=pytz.UTC)
            ist_time = utc_time.astimezone(ist)
            day_key = ist_time.strftime('%Y-%m-%d')
            
            if day_key not in totals:
                totals[day_key] = {'sales': 0, 'profit': 0, 'count': 0}
            
            if o.payment_status == 'paid':
                totals[day_key]['sales'] += float(o.grand_total or 0)
                totals[day_key]['profit'] += float(o.gross_profit or 0)
                totals[day_key]['count'] += 1
            
            print(f"{str(o.order_number):<10} | {utc_time.strftime('%Y-%m-%d %H:%M'):<20} | {ist_time.strftime('%Y-%m-%d %H:%M'):<20} | {float(o.grand_total):<10.2f} | {o.status:<10} | {o.payment_status:<10} | {day_key}")

        print("\n--- Daily Totals (Paid Only / Net) ---")
        for day, stats in sorted(totals.items()):
            print(f"{day}: Sales ₹{stats['sales']:,.2f} | Profit ₹{stats['profit']:,.2f} | Orders: {stats['count']}")

if __name__ == "__main__":
    asyncio.run(debug_daily_stats())
