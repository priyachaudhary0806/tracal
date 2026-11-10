try:
    import razorpay
except ImportError:
    razorpay = None  # Razorpay SDK not available in this environment
from ..settings import settings

# Central Razorpay client – re‑uses the same credentials as the booking flow (if any).
# The client is created once per process.
_client = None

def get_client():
    global _client
    if _client is None:
        if not settings.RAZORPAY_KEY_ID or not settings.RAZORPAY_KEY_SECRET:
            raise RuntimeError("Razorpay credentials are not configured in settings")
        _client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
        # Enable test mode when using test keys (Razorpay test keys start with "rzp_test_")
        if settings.RAZORPAY_KEY_ID.startswith("rzp_test_"):
            _client.set_app_details({"title": "Tracal Test", "version": "dev"})
    return _client

def create_order(amount_rupees: int, receipt: str, currency: str = "INR"):
    """Create a Razorpay order.

    amount_rupees: price in INR (whole rupees). Razorpay expects paise, so we multiply by 100.
    receipt: an opaque identifier (we will use the subscription document _id).
    Returns the order dict from Razorpay.
    """
    client = get_client()
    # Razorpay expects amount in the smallest currency unit (paise)
    amount_paise = amount_rupees * 100
    order_data = {
        "amount": amount_paise,
        "currency": currency,
        "receipt": receipt,
        "payment_capture": 1,  # auto‑capture
    }
    return client.order.create(order_data)

def verify_signature(order_id: str, payment_id: str, signature: str) -> bool:
    """Return True if the provided Razorpay signature is valid.
    Uses the same HMAC‑SHA256 verification that Razorpay recommends.
    """
    client = get_client()
    try:
        client.utility.verify_payment_signature({
            "razorpay_order_id": order_id,
            "razorpay_payment_id": payment_id,
            "razorpay_signature": signature,
        })
        return True
    except razorpay.errors.SignatureVerificationError:
        return False

def fetch_payment(payment_id: str):
    """Fetch a Razorpay payment object. Used for server‑side status/amount checks."""
    client = get_client()
    return client.payment.fetch(payment_id)

