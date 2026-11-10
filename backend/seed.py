import asyncio
import datetime
from bson import ObjectId
from backend.database import user_collection, homestay_collection
from backend.routers.auth import get_password_hash

async def seed_db():
    print("Seeding database...")
    
    # 1. Create a demo user for these homestays
    demo_user = await user_collection.find_one({"email": "host@tracal.com"})
    if not demo_user:
        new_user = {
            "name": "Tracal Host",
            "email": "host@tracal.com",
            "password": get_password_hash("password123"),
            "favoriteIds": [],
            "createdAt": datetime.datetime.utcnow()
        }
        res = await user_collection.insert_one(new_user)
        user_id = str(res.inserted_id)
        print(f"Created new host user with ID: {user_id}")
    else:
        user_id = str(demo_user["_id"])
        print(f"Using existing host user with ID: {user_id}")
        
    # 2. Check if we already have homestays, if not, add them
    count = await homestay_collection.count_documents({})
    if count > 0:
        print(f"Found {count} existing homestays. Deleting and re-seeding...")
        await homestay_collection.delete_many({})

    # Real looking data
    homestays = [
        {
            "title": "Luxury Beachfront Villa with Private Pool",
            "description": "Experience the ultimate beach getaway in this stunning villa located in Goa. Featuring gorgeous ocean views, a private infinity pool, and modern amenities. Perfect for families or groups looking for a relaxing holiday.",
            "price": 8500,
            "category": "Beach",
            "address": "Baga Beach, North Goa, India",
            "images": [
                "https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=1200&q=80",
                "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=1200&q=80"
            ],
            "owner_name": "Rohan Sharma",
            "phone": "+91 9876543210",
            "email": "host@tracal.com",
            "ratings": 4.9,
            "userId": user_id,
            "createdAt": datetime.datetime.utcnow()
        },
        {
            "title": "Cozy Himalayan Wooden Cabin",
            "description": "Disconnect from the world in this cozy wooden cabin nestled high up in the mountains of Manali. Wake up to snow-capped peaks and enjoy your morning tea on the wooden deck. Ideal for couples or solo travelers.",
            "price": 3200,
            "category": "Mountain",
            "address": "Old Manali, Himachal Pradesh, India",
            "images": [
                "https://images.unsplash.com/photo-1449844908441-8829872d2607?w=1200&q=80",
                "https://images.unsplash.com/photo-1542718610-a1d656d1884c?w=1200&q=80"
            ],
            "owner_name": "Priya Singh",
            "phone": "+91 9123456789",
            "email": "host@tracal.com",
            "ratings": 4.8,
            "userId": user_id,
            "createdAt": datetime.datetime.utcnow()
        },
        {
            "title": "Heritage Suite in the Pink City",
            "description": "Stay in a beautifully restored heritage haveli right in the heart of Jaipur. Experience royal Rajasthani hospitality with traditional decor, modern comforts, and delicious home-cooked meals.",
            "price": 4500,
            "category": "City",
            "address": "Bani Park, Jaipur, Rajasthan",
            "images": [
                "https://images.unsplash.com/photo-1582610116397-edb318620f90?w=1200&q=80",
                "https://images.unsplash.com/photo-1590050756781-6fdf396df83b?w=1200&q=80"
            ],
            "owner_name": "Vikram Rathore",
            "phone": "+91 9988776655",
            "email": "host@tracal.com",
            "ratings": 4.7,
            "userId": user_id,
            "createdAt": datetime.datetime.utcnow()
        },
        {
            "title": "Tranquil Backwaters Farm Stay",
            "description": "Immerse yourself in authentic village life by the serene backwaters of Kerala. Our farm stay offers organic meals, canoe rides, and peaceful surroundings away from city noise.",
            "price": 2800,
            "category": "Village",
            "address": "Kumarakom, Kerala, India",
            "images": [
                "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=1200&q=80",
                "https://images.unsplash.com/photo-1593693397690-362cb9666c6b?w=1200&q=80"
            ],
            "owner_name": "Anoop Nair",
            "phone": "+91 9998887776",
            "email": "host@tracal.com",
            "ratings": 4.9,
            "userId": user_id,
            "createdAt": datetime.datetime.utcnow()
        }
    ]

    await homestay_collection.insert_many(homestays)
    print(f"Successfully seeded {len(homestays)} homestays!")

if __name__ == "__main__":
    asyncio.run(seed_db())
