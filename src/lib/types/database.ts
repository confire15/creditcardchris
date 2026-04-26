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
