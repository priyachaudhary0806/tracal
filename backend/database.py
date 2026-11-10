import motor.motor_asyncio

from .settings import settings

MONGO_DETAILS = settings.MONGO_DETAILS

client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_DETAILS)
database = client.tracal_db

user_collection             = database.get_collection("users")
homestay_collection         = database.get_collection("homestays")
booking_collection          = database.get_collection("bookings")
enquiry_collection          = database.get_collection("enquiries")        # ← was missing
review_collection           = database.get_collection("reviews")
payment_collection          = database.get_collection("payments")
coupon_collection           = database.get_collection("coupons")
availability_collection     = database.get_collection("availability")
host_verification_collection = database.get_collection("host_verifications")  # ← was missing
view_history_collection     = database.get_collection("view_history")
notification_collection     = database.get_collection("notifications")
admin_log_collection        = database.get_collection("admin_logs")
subscription_collection = database.get_collection("subscriptions")  # new collection for subscription plans
personality_assessments_collection = database.get_collection("personality_assessments")

