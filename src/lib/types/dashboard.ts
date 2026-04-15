import type {
  UserCard,
  StatementCredit,
  CardPerk,
  SpendingCategory,
} from "./database";

/**
 * Shared props for dashboard sub-components that operate on the full
 * cards/credits/perks/categories/globalSpend bundle fetched once in the
 * dashboard page server component.
 */
export type DashboardSectionProps = {
  cards: UserCard[];
  credits: StatementCredit[];
  perks: CardPerk[];
  categories: SpendingCategory[];
  globalSpend: Record<string, number>;
};
