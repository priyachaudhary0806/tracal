/**
 * Centralized Client-Side Feature Access Configuration for TRACAL AI Features.
 *
 * Current Phase:
 * - 100% FREE access for all registered Travellers/Guests, Hosts, and Admins.
 * - No subscription locks or paywalls.
 *
 * Future Compatibility:
 * - Enable SUBSCRIPTION_ENFORCEMENT when payment tiers are introduced without modifying components.
 */

export const FEATURE_FLAGS = {
  SUBSCRIPTION_ENFORCEMENT: false,
  FREE_ACCESS_TIER: true,
} as const;

export const AI_FEATURES = {
  BUDGET_PLANNER: "budget_planner",
  PERSONALITY: "personality",
  LOCAL_EXPLORER: "local_explorer",
  TRUSTSCORE: "trustscore",
  REVIEW_INTELLIGENCE: "review_intelligence",
  REALITY_CHECK: "reality_check",
} as const;

export type AIFeatureKey = (typeof AI_FEATURES)[keyof typeof AI_FEATURES];

export function canAccessFeature(user: any, featureKey: AIFeatureKey | string): boolean {
  if (!FEATURE_FLAGS.SUBSCRIPTION_ENFORCEMENT) {
    return true; // Free access for all users during current phase
  }

  // Future tier verification hook
  return Boolean(user);
}

