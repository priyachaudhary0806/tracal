import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os

async def main():
    # Load env var for MONGODB_URI if exists, else default
    mongo_uri = os.getenv('MONGODB_URI', 'mongodb://localhost:27017')
    client = AsyncIOMotorClient(mongo_uri)
    db = client.tracal_db
    categories = await db.homestays.distinct('category')
    print('Distinct categories:', categories)
    await client.close()

if __name__ == '__main__':
    asyncio.run(main())

