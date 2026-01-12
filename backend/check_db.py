import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def check_database():
    client = AsyncIOMotorClient(
        'mongodb+srv://vamshikrishnabrungi_db_user:FsWrEJMbaSSseloe@cluster0.qlu4qx5.mongodb.net/?retryWrites=true&w=majority',
        tlsAllowInvalidCertificates=True,
        tlsAllowInvalidHostnames=True
    )
    
    # List all databases
    db_list = await client.list_database_names()
    print(f"📦 Available databases: {db_list}")
    
    # Check annya_jewellers database
    db = client['annya_jewellers']
    collections = await db.list_collection_names()
    print(f"\n📁 Collections in 'annya_jewellers': {collections}")
    
    # Count documents in each collection
    for coll_name in collections:
        count = await db[coll_name].count_documents({})
        print(f"   - {coll_name}: {count} documents")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(check_database())
