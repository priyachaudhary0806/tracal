"""Remove test users created during Phase 5 testing."""
import asyncio
import motor.motor_asyncio

EMAILS_TO_REMOVE = ["guesttest9@example.com"]

async def main():
    db = motor.motor_asyncio.AsyncIOMotorClient("mongodb://localhost:27017").tracal_db
    for email in EMAILS_TO_REMOVE:
        r = await db.users.delete_one({"email": email})
        print(f"Deleted {email}: {r.deleted_count}")

asyncio.run(main())
