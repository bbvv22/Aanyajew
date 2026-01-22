import asyncio
import os
from database import async_session_maker
from db_models import AbandonedCartDB
from sqlalchemy import select
from datetime import datetime, timezone

async def check_carts():
    async with async_session_maker() as db:
        print("\n🔍 Checking Abandoned Carts in DB...")
        result = await db.execute(select(AbandonedCartDB))
        carts = result.scalars().all()
        
        now = datetime.now(timezone.utc)
        print(f"🕒 Current UTC Time: {now}")
        
        for cart in carts:
            age = now - cart.updated_at
            print(f"\n🛒 Cart ID: {cart.id}")
            print(f"   Email: {cart.email}")
            print(f"   Status: {cart.status}")
            print(f"   Updated: {cart.updated_at} ({age.total_seconds()/60:.1f} mins ago)")
            print(f"   Reminders Sent: {cart.reminder_count}")
            print(f"   Last Reminder: {cart.last_reminder_at}")

if __name__ == "__main__":
    asyncio.run(check_carts())
