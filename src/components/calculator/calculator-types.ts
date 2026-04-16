export type PointValuation = 0.01 | 0.015 | 0.02;

export type Step = 1 | 2 | 3 | 4;

export type MonthlySpend = {
  dining: number;
  travel: number;
  groceries: number;
};

export type CalculatorState = {
  step: Step;
  direction: 1 | -1;
  pointValuation: PointValuation | null;
  monthlySpend: MonthlySpend;
  utilizationFactor: number;
  spendMultiplier: number;
  diningPicked: boolean;
  travelPicked: boolean;
  equinoxToggled: boolean;
};

export type CalculatorAction =
  | { type: "SELECT_VALUATION"; value: PointValuation }
  | { type: "PICK_DINING"; monthly: number }
  | { type: "PICK_TRAVEL"; monthly: number }
  | { type: "SET_EQUINOX_TOGGLED"; value: boolean }
  | { type: "SET_UTILIZATION"; value: number }
  | { type: "SET_SPEND_MULTIPLIER"; value: number }
  | { type: "NEXT" }
  | { type: "BACK" }
  | { type: "GOTO"; step: Step };

export const ANNUAL_FEE = 695;
export const EQUINOX_CREDIT = 300;
