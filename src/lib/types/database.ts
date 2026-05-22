export type SpendingCategory = {
  id: string;
  name: string;
  display_name: string;
  icon: string | null;
  user_id: string | null;
  created_at: string;
};

export type CardTemplate = {
  id: string;
  name: string;
  issuer: string;
  network: string;
  annual_fee: number;
  reward_type: string;
  reward_unit: string;
  base_reward_rate: number;
  image_url: string | null;
  color: string | null;
  created_at: string;
  rewards?: CardTemplateReward[];
};

export type CardTemplateReward = {
  id: string;
  card_template_id: string;
  category_id: string;
  multiplier: number;
  cap_amount: number | null;
  created_at: string;
  category?: SpendingCategory;
};

export type UserCard = {
  id: string;
  user_id: string;
  card_template_id: string | null;
  nickname: string | null;
  custom_name: string | null;
  custom_issuer: string | null;
  custom_network: string | null;
  custom_reward_type: string | null;
  custom_reward_unit: string | null;
  custom_base_reward_rate: number | null;
  custom_color: string | null;
  last_four: string | null;
  is_active: boolean;
  sort_order: number;
  points_expiration_date: string | null;
  annual_fee_date: string | null;
  account_opened_on?: string | null;
  annual_fee_date_source?: "exact" | "estimated_from_opened_on" | "unknown" | string | null;
  annual_fee_reminders_enabled?: boolean;
  annual_fee_reminder_days?: number[] | null;
  custom_annual_fee: number | null;
  custom_cpp: number | null;
  cpp_redemption_mode: string | null;
  created_at: string;
  updated_at: string;
  card_template?: CardTemplate;
  rewards?: UserCardReward[];
};

export type UserCardReward = {
  id: string;
  user_card_id: string;
  category_id: string;
  multiplier: number;
  cap_amount: number | null;
  created_at: string;
  category?: SpendingCategory;
};

export type RewardsGoal = {
  id: string;
  user_id: string;
  name: string;
  target_points: number;
  target_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type StatementCredit = {
  id: string;
  user_card_id: string;
  user_id: string;
  name: string;
  annual_amount: number;
  used_amount: number;
  reset_month: number;
  will_use: boolean;
  cadence: "monthly" | "quarterly" | "semi-annual" | "annual" | string | null;
  period_amount: number | null;
  eligible_merchant_text: string | null;
  activation_hint: string | null;
  organic_value: boolean | null;
  created_at: string;
  updated_at: string;
};

export type SpendingBudget = {
  id: string;
  user_id: string;
  category_id: string;
  monthly_limit: number;
  rollover_enabled: boolean;
  rollover_amount: number;
  created_at: string;
  updated_at: string;
  category?: SpendingCategory;
};

export type PublicProfile = {
  user_id: string;
  referral_code: string;
  display_name: string;
  member_since: string;
  cards_count: number;
  total_rewards: number;
  updated_at: string;
};

export type CardApplication = {
  id: string;
  user_id: string;
  card_template_id: string | null;
  custom_card_name: string | null;
  issuer: string;
  applied_on: string;
  outcome: "pending" | "approved" | "denied";
  approved_on: string | null;
  is_business_card: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type Subscription = {
  id: string;
  user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  plan: "free" | "premium";
  status: string;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
};

export type PerkType = "credit" | "lounge" | "free_night" | "status" | "other";
export type PerkValueType = "dollar" | "count" | "boolean";
export type PerkResetCadence = "monthly" | "annual" | "calendar_year";

export type CardPerkTemplate = {
  id: string;
  card_template_id: string;
  name: string;
  description: string | null;
  perk_type: PerkType;
  value_type: PerkValueType;
  annual_value: number | null;
  annual_count: number | null;
  reset_cadence: PerkResetCadence;
  sort_order: number;
  created_at: string;
};

export type CardPerk = {
  id: string;
  user_id: string;
  user_card_id: string;
  card_perk_template_id: string | null;
  name: string;
  description: string | null;
  perk_type: PerkType;
  value_type: PerkValueType;
  annual_value: number | null;
  annual_count: number | null;
  used_value: number;
  used_count: number;
  is_redeemed: boolean;
  reset_cadence: PerkResetCadence;
  reset_month: number;
  last_reset_at: string | null;
  notify_before_reset: boolean;
  notify_days_before: number;
  is_active: boolean;
  sort_order: number;
  notes: string | null;
  closed_via_app_at: string | null;
  closed_via_action_id: string | null;
  created_at: string;
  updated_at: string;
  user_card?: UserCard;
};

export type CardPerkActionType =
  | "purchase_gift_card"
  | "topup_balance"
  | "open_merchant"
  | "file_claim"
  | "copy_code";

export type CardPerkAction = {
  id: string;
  card_perk_template_id: string;
  label: string;
  action_type: CardPerkActionType;
  deep_link_url: string | null;
  fallback_web_url: string;
  prefill_amount_cents: number | null;
  instructions: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
};

export type CardDowngradePath = {
  id: string;
  from_template_id: string;
  to_template_id: string;
  relationship: "downgrade" | "product_change";
  notes: string | null;
  created_at: string;
  from_template?: CardTemplate;
  to_template?: CardTemplate;
};

export type UserCategorySpend = {
  id: string;
  user_id: string;
  user_card_id: string | null;
  category_id: string;
  monthly_amount: number;
  source: "manual" | "transaction" | "default";
  created_at: string;
  updated_at: string;
  category?: SpendingCategory;
};

export type NotificationPreferences = {
  id: string;
  user_id: string;
  push_enabled: boolean;
  email_enabled: boolean;
  sms_enabled: boolean;
  phone_number: string | null;
  created_at: string;
  updated_at: string;
};

export type CardSub = {
  id: string;
  user_id: string;
  user_card_id: string;
  reward_amount: number;
  reward_unit: string;
  required_spend: number;
  current_spend: number;
  deadline: string;
  is_met: boolean;
  met_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type SpendChallenge = {
  id: string;
  user_id: string;
  user_card_id: string | null;
  category_id: string | null;
  source: "manual" | "sub" | "retention";
  source_ref: string | null;
  title: string;
  reward_description: string | null;
  target_spend: number;
  current_spend: number;
  starts_on: string;
  ends_on: string;
  is_met: boolean;
  met_at: string | null;
  created_at: string;
  updated_at: string;
};

export type LoyaltyAccount = {
  id: string;
  user_id: string;
  program_name: string;
  program_type: "airline" | "hotel" | "bank" | "other" | string;
  balance: number;
  point_value_cpp: number;
  expiration_date: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type UserCardOffer = {
  id: string;
  user_id: string;
  user_card_id: string | null;
  merchant: string;
  offer_type: "statement_credit" | "cash_back" | "points" | "discount" | string;
  value_amount: number | null;
  value_percent: number | null;
  minimum_spend: number | null;
  expires_on: string | null;
  is_activated: boolean;
  is_used: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  user_card?: UserCard | null;
};

export type RotatingCategoryPeriod = {
  id: string;
  card_template_id: string | null;
  issuer: string;
  year: number;
  quarter: number;
  category_name: string;
  multiplier: number;
  cap_amount: number | null;
  activation_url: string | null;
  starts_on: string;
  ends_on: string;
  created_at: string;
  card_template?: CardTemplate | null;
};

export type UserRotatingCategoryStatus = {
  id: string;
  user_id: string;
  user_card_id: string;
  rotating_category_period_id: string;
  is_activated: boolean;
  cap_spend: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  rotating_category_period?: RotatingCategoryPeriod;
  user_card?: UserCard;
};

export type CardRenewalReview = {
  id: string;
  user_id: string;
  user_card_id: string;
  annual_fee_posted_on: string | null;
  refund_deadline: string | null;
  retention_offer_value: number | null;
  retention_offer_notes: string | null;
  decision: "undecided" | "keep" | "cancel" | "downgrade" | string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type CardProtectionTemplate = {
  id: string;
  card_template_id: string;
  protection_type: string;
  summary: string;
  coverage_limit: string | null;
  claim_window: string | null;
  terms_url: string | null;
  sort_order: number;
  created_at: string;
  card_template?: CardTemplate;
};

export type CardChangeEvent = {
  id: string;
  card_template_id: string | null;
  issuer: string;
  title: string;
  change_type: "fee" | "benefit" | "reward" | "transfer" | string;
  summary: string;
  effective_on: string | null;
  estimated_annual_impact: number | null;
  source_url: string | null;
  created_at: string;
  card_template?: CardTemplate | null;
};

export type UserCardChangeDismissal = {
  id: string;
  user_id: string;
  card_change_event_id: string;
  dismissed_at: string;
};

export type HouseholdCardInstruction = {
  id: string;
  user_id: string;
  user_card_id: string;
  label: string;
  instructions: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  user_card?: UserCard;
};

export type AgentRun = {
  id: string;
  user_id: string;
  flow_type: string;
  prompt_version: string;
  model_provider: string | null;
  status: "running" | "completed" | "failed" | string;
  compact_input_summary: Record<string, unknown>;
  error: string | null;
  started_at: string;
  completed_at: string | null;
  created_at: string;
};

export type AgentRecommendation = {
  id: string;
  run_id: string;
  user_id: string;
  type:
    | "credit_capture"
    | "renewal_rescue"
    | "offer_matcher"
    | "sub_pace"
    | "points_expiration"
    | "purchase_rule"
    | "data_cleanup"
    | string;
  priority: number;
  confidence: number;
  title: string;
  rationale: string;
  source_refs: Array<{ type: string; id: string; label?: string }>;
  proposed_action: {
    type: "navigate" | "review" | string;
    href: string;
    label: string;
    payload?: Record<string, unknown>;
  };
  status: "active" | "accepted" | "dismissed" | "stale" | string;
  created_at: string;
  updated_at: string;
};

export type AgentFeedback = {
  id: string;
  recommendation_id: string;
  user_id: string;
  feedback_type: "accepted" | "dismissed" | "corrected" | string;
  notes: string | null;
  created_at: string;
};

export type UserActionStatus = "active" | "started" | "completed" | "dismissed" | "snoozed" | "stale";

export type UserAction = {
  id: string;
  user_id: string;
  source_type: string;
  action_type: string;
  title: string;
  rationale: string;
  priority: number;
  confidence: number;
  source_refs: Array<{ type: string; id: string; label?: string }>;
  proposed_action: {
    type: "navigate" | "review" | "deep_link" | "open_url" | "mark_complete" | "copy_text" | "checklist" | string;
    href: string;
    label: string;
    payload?: Record<string, unknown>;
  };
  value_estimate_cents: number | null;
  due_at: string | null;
  expires_at: string | null;
  snoozed_until: string | null;
  status: UserActionStatus;
  recurrence_key: string;
  created_at: string;
  updated_at: string;
};
