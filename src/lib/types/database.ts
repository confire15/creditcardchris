export type SpendingCategory = {
  id: string;
  name: string;
  display_name: string;
  icon: string | null;
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
  card_name: string;
  issuer: string;
  applied_date: string;
  status: "pending" | "approved" | "denied" | "cancelled";
  bonus_offer: string | null;
  annual_fee: number;
  credit_score_used: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type PlaidItem = {
  id: string;
  user_id: string;
  item_id: string;
  institution_name: string | null;
  institution_id: string | null;
  cursor: string | null;
  last_synced_at: string | null;
  created_at: string;
  plaid_accounts?: PlaidAccount[];
};

export type PlaidAccount = {
  id: string;
  plaid_item_id: string;
  user_id: string;
  plaid_account_id: string;
  name: string;
  official_name: string | null;
  type: string | null;
  subtype: string | null;
  mask: string | null;
  created_at: string;
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

export type Transaction = {
  id: string;
  user_id: string;
  user_card_id: string | null;
  category_id: string;
  amount: number;
  merchant: string | null;
  description: string | null;
  transaction_date: string;
  transaction_type: "expense" | "income" | "refund" | "transfer";
  refund_status: "pending" | "received" | null;
  rewards_earned: number | null;
  plaid_transaction_id: string | null;
  is_pending: boolean;
  created_at: string;
  updated_at: string;
  user_card?: UserCard;
  category?: SpendingCategory;
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
  created_at: string;
  updated_at: string;
  user_card?: UserCard;
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
  category_id: string;
  monthly_amount: number;
  source: "manual" | "transaction" | "default";
  created_at: string;
  updated_at: string;
  category?: SpendingCategory;
};

export type TrackedSubscription = {
  id: string;
  user_id: string;
  merchant: string;
  category: string | null;
  card_id: string | null;
  amount: number;
  billing_cycle: "monthly" | "annual";
  last_charged_at: string | null;
  next_charge_at: string | null;
  price_alert_enabled: boolean;
  previous_amount: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};
