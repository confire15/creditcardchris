export type PointValuation = 0.01 | 0.015 | 0.02;

export type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export type MonthlySpend = {
  dining: number;
  travel: number;
  groceries: number;
  hotels: number;
  gas: number;
  transit: number;
};

/** Per-credit utilization, keyed by PremiumCardCredit.id. 0..1 range. */
export type CreditUtilization = Record<string, number>;

export type CalculatorState = {
  step: Step;
  direction: 1 | -1;
  selectedCardId: string | null;
  pointValuation: PointValuation | null;
  monthlySpend: MonthlySpend;
  spendMultiplier: number;
  diningPicked: boolean;
  travelPicked: boolean;
  groceriesPicked: boolean;
  hotelsPicked: boolean;
  gasPicked: boolean;
  transitPicked: boolean;
  creditUtilization: CreditUtilization;
};

export type CalculatorAction =
  | { type: "SELECT_CARD"; cardId: string }
  | { type: "SELECT_VALUATION"; value: PointValuation }
  | { type: "PICK_DINING"; monthly: number }
  | { type: "PICK_TRAVEL"; monthly: number }
  | { type: "PICK_GROCERIES"; monthly: number }
  | { type: "PICK_HOTELS"; monthly: number }
  | { type: "PICK_GAS"; monthly: number }
  | { type: "PICK_TRANSIT"; monthly: number }
  | { type: "SET_CREDIT_UTILIZATION"; creditId: string; value: number }
  | { type: "SET_SPEND_MULTIPLIER"; value: number }
  | { type: "NEXT" }
  | { type: "BACK" }
  | { type: "GOTO"; step: Step };
