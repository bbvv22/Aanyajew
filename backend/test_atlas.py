import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def test_connection():
    try:
        # Connect to MongoDB Atlas with SSL workaround
        client = AsyncIOMotorClient(
            'mongodb+srv://vamshikrishnabrungi_db_user:FsWrEJMbaSSseloe@cluster0.qlu4qx5.mongodb.net/annya_jewellers?retryWrites=true&w=majority',
            tlsAllowInvalidCertificates=True,
            tlsAllowInvalidHostnames=True,
            serverSelectionTimeoutMS=5000
        )
        
        db = client['annya_jewellers']
        
        # Test connection by counting products
        count = await db.products.count_documents({})
        
        print(f"✅ SUCCESS! Connected to MongoDB Atlas")
        print(f"✅ Found {count} products in database")
        
        client.close()
        return True
        
    except Exception as e:
        print(f"❌ FAILED to connect: {e}")
        return False

if __name__ == "__main__":
    asyncio.run(test_connection())
