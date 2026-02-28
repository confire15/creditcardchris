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
  created_at: string;
  updated_at: string;
};

export type SpendingBudget = {
  id: string;
  user_id: string;
  category_id: string;
  monthly_limit: number;
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

export type Transaction = {
  id: string;
  user_id: string;
  user_card_id: string | null;
  category_id: string;
  amount: number;
  merchant: string | null;
  description: string | null;
  transaction_date: string;
  rewards_earned: number | null;
  created_at: string;
  updated_at: string;
  user_card?: UserCard;
  category?: SpendingCategory;
};
