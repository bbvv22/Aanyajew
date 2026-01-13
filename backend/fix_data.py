
import asyncio
from sqlalchemy import select, update
from database import async_session_maker
from db_models import OrderDB

async def fix_payment_statuses():
    async with async_session_maker() as session:
        # Find orders that are 'delivered' or 'shipped' but not 'paid' in payment_status
        # We'll treat 'delivered' as implicitly 'paid' for this fix
        stmt = select(OrderDB).where(
            OrderDB.status.in_(['delivered', 'shipped', 'completed']),
            OrderDB.payment_status != 'paid'
        )
        result = await session.execute(stmt)
        orders = result.scalars().all()
        
        print(f"Found {len(orders)} orders to update.")
        
        if not orders:
            return

        # Bulk update
        update_stmt = update(OrderDB).where(
            OrderDB.id.in_([o.id for o in orders])
        ).values(payment_status='paid')
        
        await session.execute(update_stmt)
        await session.commit()
        print("Successfully updated payment statuses to 'paid'.")

if __name__ == "__main__":
    asyncio.run(fix_payment_statuses())
