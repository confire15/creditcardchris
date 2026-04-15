// Subscription status helpers. Keep the "premium" check in one place so any
// future plan/status nuance (e.g. trialing, past_due) updates a single site.

type SubscriptionLike =
  | { plan?: string | null; status?: string | null }
  | null
  | undefined;

export function isPremiumPlan(sub: SubscriptionLike): boolean {
  return sub?.plan === "premium" && sub?.status === "active";
}
