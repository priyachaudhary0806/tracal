import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from backend.settings import settings

async def main():
    client = AsyncIOMotorClient(settings.MONGO_DETAILS)
    try:
        db = client.tracal_db
        categories = await db.homestays.distinct("category")

        print("\nExisting MongoDB categories:")
        for category in categories:
            print(repr(category))

        print("\nTotal categories:", len(categories))

    finally:
        client.close()

asyncio.run(main())