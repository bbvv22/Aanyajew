import asyncio
import os
import uuid
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "jew_store")

# Sample reviews to add to all products
sample_reviews = [
    {
        "userName": "PRIYA",
        "title": "Software Engineer, Mumbai",
        "comment": "Absolutely stunning piece! The craftsmanship is exceptional and it looks even better in person.",
        "rating": 5,
        "verified": True
    },
    {
        "userName": "MAYA",
        "title": "Doctor, Hyderabad", 
        "comment": "Beautiful design and perfect fit. Worth every penny!",
        "rating": 5,
        "verified": True
    },
    {
        "userName": "ANANYA",
        "title": "Teacher, Bangalore",
        "comment": "Received so many compliments wearing this. The quality is outstanding.",
        "rating": 4,
        "verified": True
    }
]

async def seed_reviews():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    # Get all products
    products = await db.products.find({}, {"id": 1}).to_list(1000)
    print(f"Found {len(products)} products")
    
    # Clear existing reviews
    await db.reviews.delete_many({})
    print("Cleared existing reviews")
    
    # Add reviews for each product
    reviews_to_insert = []
    for product in products:
        product_id = product["id"]
        # Add one random review to each product
        review_template = sample_reviews[len(reviews_to_insert) % len(sample_reviews)]
        review = {
            "id": str(uuid.uuid4()),
            "productId": product_id,
            "userId": str(uuid.uuid4()),
            "userName": review_template["userName"],
            "title": review_template["title"],
            "comment": review_template["comment"],
            "rating": review_template["rating"],
            "verified": review_template["verified"],
            "createdAt": datetime.now(timezone.utc).isoformat()
        }
        reviews_to_insert.append(review)
    
    if reviews_to_insert:
        await db.reviews.insert_many(reviews_to_insert)
        print(f"Added {len(reviews_to_insert)} reviews")
    
    client.close()
    print("Done!")

if __name__ == "__main__":
    asyncio.run(seed_reviews())
