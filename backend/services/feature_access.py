"""
Centralized Feature Access Control for TRACAL AI Features.

CURRENT PHASE:
All six AI features are 100% FREE for all registered Guests/Travellers, Hosts, and Admins.
No subscription locks, usage throttles, or payment requirements are enforced.

FUTURE COMPATIBILITY:
When subscription plans are introduced after deployment, toggle SUBSCRIPTION_ENFORCEMENT_ENABLED = True
and implement the tier check inside `check_feature_access()` without having to rewrite any AI features.
"""

from typing import Dict, Any, Optional

SUBSCRIPTION_ENFORCEMENT_ENABLED: bool = False

AI_FEATURE_BUDGET_PLANNER     = "budget_planner"
AI_FEATURE_PERSONALITY          = "personality"
AI_FEATURE_LOCAL_EXPLORER       = "local_explorer"
AI_FEATURE_TRUSTSCORE           = "trustscore"
AI_FEATURE_REVIEW_INTELLIGENCE  = "review_intelligence"
AI_FEATURE_REALITY_CHECK        = "reality_check"

ALL_AI_FEATURES = [
    AI_FEATURE_BUDGET_PLANNER,
    AI_FEATURE_PERSONALITY,
    AI_FEATURE_LOCAL_EXPLORER,
    AI_FEATURE_TRUSTSCORE,
    AI_FEATURE_REVIEW_INTELLIGENCE,
    AI_FEATURE_REALITY_CHECK,
]

def check_feature_access(user: Optional[Dict[str, Any]], feature_name: str) -> bool:
    """
    Evaluates whether the given user has access to a specific AI feature.
    Always returns True during the current free-access deployment phase.
    """
    if not SUBSCRIPTION_ENFORCEMENT_ENABLED:
        return True

    # Future tier-checking logic:
    # return user.get("subscription_status") in ("active", "trial")
    return True

