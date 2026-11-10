from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional
from datetime import datetime

class UserModel(BaseModel):
    name: str
    email: EmailStr
    password: str
    favoriteIds: List[str] = []
    role: str = "guest"  # guest | host | admin
    host_verified: bool = False  # New field for host verification status
    is_verified: bool = False    # Email verification status for newly registered users
    createdAt: datetime = Field(default_factory=datetime.utcnow)

class UserResponse(BaseModel):
    id: str
    name: str
    email: EmailStr
    favoriteIds: List[str] = []  # default so existing users without this field still serialize
    role: str = "guest"          # guest | host | admin — exposed to frontend for nav decisions
    host_verified: bool = False
    is_verified: bool = False

class VerifyEmailRequest(BaseModel):
    token: str

class ResendVerificationRequest(BaseModel):
    email: EmailStr

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class HomestayModel(BaseModel):
    title: str
    description: str
    price: int
    category: str
    address: str
    images: List[str] = []
    owner_name: str
    phone: str
    email: EmailStr
    ratings: float = 0.0
    userId: str
    whatsapp: Optional[str] = ""
    guestCount: Optional[int] = 1
    roomCount: Optional[int] = 1
    bathroomCount: Optional[int] = 1
    createdAt: datetime = Field(default_factory=datetime.utcnow)

class HomestayResponse(HomestayModel):
    id: str

class ForgotPassword(BaseModel):
    email: EmailStr

class BookingModel(BaseModel):
    homestayId: str
    userId: Optional[str] = None
    name: str
    email: EmailStr
    phone: str
    startDate: datetime
    endDate: datetime
    guestCount: int
    status: str = "pending" # pending, approved, cancelled
    createdAt: datetime = Field(default_factory=datetime.utcnow)

class BookingResponse(BookingModel):
    id: str

# ---------------------------------------------------------------------------
# Budget Planner models
# ---------------------------------------------------------------------------

from datetime import date
from typing import Dict, List, Optional, Any

class BudgetRequest(BaseModel):
    destination: str
    total_budget: int  # in INR
    travellers: int
    start_date: date
    end_date: date
    preferences: Optional[str] = None  # free‑text user preferences

class ComponentEstimate(BaseModel):
    estimate: int  # INR
    details: Optional[str] = None

class BudgetResponse(BaseModel):
    accommodation: ComponentEstimate
    food: ComponentEstimate
    transport: ComponentEstimate
    activities: ComponentEstimate
    total_estimated: int
    shortfall: Optional[int] = None  # if >0, budget insufficient
    message: Optional[str] = None  # explanatory note
    suggestions: Optional[List[Dict[str, Any]]] = None  # e.g., cheaper homestay ids/titles
    destination: Optional[str] = None
    nights: Optional[int] = None
    travellers: Optional[int] = None
    recommended_homestay: Optional[Dict[str, Any]] = None

class EnquiryModel(BaseModel):
    homestayId: str
    name: str
    email: EmailStr
    message: str
    createdAt: datetime = Field(default_factory=datetime.utcnow)

class EnquiryResponse(EnquiryModel):
    id: str

# Host verification model
class HostVerificationModel(BaseModel):
    userId: str
    full_name: str
    phone: str
    id_type: str  # e.g., passport, driver_license
    address: str
    id_document_path: str  # server file path
    ownership_proof_path: str  # server file path
    status: str = "pending"  # pending, approved, rejected
    rejectionReason: Optional[str] = None
    submittedAt: datetime = Field(default_factory=datetime.utcnow)
    reviewedAt: Optional[datetime] = None

class HostVerificationResponse(HostVerificationModel):
    id: str

# Availability models
class AvailabilityBlockedRange(BaseModel):
    start: datetime
    end: datetime

class AvailabilityModel(BaseModel):
    homestayId: str
    blockedDates: List[AvailabilityBlockedRange] = []

class AvailabilityResponse(AvailabilityModel):
    id: str

class ReviewModel(BaseModel):
    homestayId: str
    bookingId: str
    rating: int  # 1-5 stars
    comment: Optional[str] = None
    images: List[str] = []
    hostResponse: Optional[str] = None  # Host's optional reply
    createdAt: datetime = Field(default_factory=datetime.utcnow)

class ReviewResponse(ReviewModel):
    id: str

# Notification models
class NotificationModel(BaseModel):
    userId: str
    type: str  # e.g., "booking_status", "new_booking", "review", "enquiry"
    message: str
    read: bool = False
    createdAt: datetime = Field(default_factory=datetime.utcnow)

class NotificationResponse(NotificationModel):
    id: str

# ---------------------------------------------------------------------------
# Admin models
# ---------------------------------------------------------------------------

class AdminLogModel(BaseModel):
    adminId: str
    adminEmail: str
    action: str          # e.g. "change_role", "deactivate_user", "moderate_homestay"
    targetType: str      # e.g. "user", "homestay", "booking", "verification"
    targetId: str
    details: Optional[dict] = None   # additional context (old value, new value, reason, etc.)
    createdAt: datetime = Field(default_factory=datetime.utcnow)

class AdminLogResponse(AdminLogModel):
    id: str

class AdminUserUpdateModel(BaseModel):
    role: Optional[str] = None          # guest | host | admin
    is_active: Optional[bool] = None    # True = active, False = deactivated

class AdminHomestayUpdateModel(BaseModel):
    moderation_status: str   # active | deactivated | rejected
    moderation_reason: Optional[str] = None

class AdminReviewUpdateModel(BaseModel):
    is_hidden: Optional[bool] = None
    moderation_reason: Optional[str] = None

class ReportReviewPayload(BaseModel):
    reason: str

class PaymentModel(BaseModel):
    bookingId: str
    userId: str
    amount: float
    currency: str = "INR"
    status: str = "pending"   # pending | success | failed | refunded
    payment_gateway: str = "razorpay"
    gateway_order_id: Optional[str] = None
    gateway_payment_id: Optional[str] = None
    gateway_signature: Optional[str] = None
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: Optional[datetime] = None

class PaymentResponse(PaymentModel):
    id: str

class CouponModel(BaseModel):
    code: str
    discount_type: str = "percent"   # percent | fixed
    discount_value: float
    min_booking_amount: Optional[float] = None
    max_uses: Optional[int] = None
    used_count: int = 0
    valid_from: Optional[datetime] = None
    valid_until: Optional[datetime] = None
    is_active: bool = True
    createdAt: datetime = Field(default_factory=datetime.utcnow)


# ---------------------------------------------------------------------------
# Subscription models
# ---------------------------------------------------------------------------

from enum import Enum

class PlanEnum(str, Enum):
    PRO_MONTHLY = "pro_monthly"
    PRO_QUARTERLY = "pro_quarterly"
    PREMIUM_YEARLY = "premium_yearly"

class SubscriptionStatus(str, Enum):
    PENDING = "pending"   # order created, awaiting payment verification
    ACTIVE = "active"
    EXPIRED = "expired"
    CANCELLED = "cancelled"

class SubscriptionModel(BaseModel):
    userId: str
    plan: PlanEnum
    status: SubscriptionStatus = SubscriptionStatus.PENDING
    orderId: Optional[str] = None          # Razorpay order id
    paymentId: Optional[str] = None        # Razorpay payment id
    signature: Optional[str] = None        # Razorpay signature (stored for audit)
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    expiresAt: Optional[datetime] = None   # set when subscription becomes ACTIVE

class CreateOrderPayload(BaseModel):
    plan: PlanEnum

class VerifyPayload(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    # plan is not required from client – we infer it from the pending subscription

class SubscriptionResponse(BaseModel):
    id: str
    plan: PlanEnum
    status: SubscriptionStatus
    orderId: Optional[str]
    paymentId: Optional[str]
    expiresAt: Optional[datetime]



# ---------------------------------------------------------------------------
# TrustScore models
# ---------------------------------------------------------------------------
from typing import List

class TrustScoreComponent(BaseModel):
    name: str
    score: int
    max_score: int
    note: Optional[str] = None

class TrustScoreResponse(BaseModel):
    homestay_id: str
    total_score: int
    breakdown: List[TrustScoreComponent]
    explanation: str
