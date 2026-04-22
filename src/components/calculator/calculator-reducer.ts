import type { CalculatorAction, CalculatorState, Step } from "./calculator-types";

export const initialState: CalculatorState = {
  step: 1,
  direction: 1,
  selectedCardId: null,
  pointValuation: null,
  monthlySpend: { dining: 0, travel: 0, groceries: 0 },
  spendMultiplier: 1,
  diningPicked: false,
  travelPicked: false,
  groceriesPicked: false,
  creditUtilization: {},
};

function clampStep(n: number): Step {
  if (n <= 1) return 1;
  if (n >= 7) return 7;
  return n as Step;
}

export function calculatorReducer(
  state: CalculatorState,
  action: CalculatorAction,
): CalculatorState {
  switch (action.type) {
    case "HYDRATE":
      return action.state;

    case "RESET":
      return initialState;

    case "SELECT_CARD":
      return {
        ...state,
        selectedCardId: action.cardId,
        step: 2,
        direction: 1,
      };

    case "SELECT_VALUATION":
      return {
        ...state,
        pointValuation: action.value,
        step: 3,
        direction: 1,
      };

    case "PICK_DINING":
      return {
        ...state,
        monthlySpend: { ...state.monthlySpend, dining: action.monthly },
        diningPicked: true,
        step: 4,
        direction: 1,
      };

    case "PICK_TRAVEL":
      return {
        ...state,
        monthlySpend: { ...state.monthlySpend, travel: action.monthly },
        travelPicked: true,
        step: 5,
        direction: 1,
      };

    case "PICK_GROCERIES":
      return {
        ...state,
        monthlySpend: { ...state.monthlySpend, groceries: action.monthly },
        groceriesPicked: true,
        step: 6,
        direction: 1,
      };

    case "SET_CREDIT_UTILIZATION":
      return {
        ...state,
        creditUtilization: {
          ...state.creditUtilization,
          [action.creditId]: action.value,
        },
      };

    case "SET_SPEND_MULTIPLIER":
      return { ...state, spendMultiplier: action.value };

    case "NEXT": {
      const next = clampStep(state.step + 1);
      return { ...state, step: next, direction: 1 };
    }

    case "BACK": {
      const prev = clampStep(state.step - 1);
      return { ...state, step: prev, direction: -1 };
    }

    case "GOTO": {
      const dir: 1 | -1 = action.step >= state.step ? 1 : -1;
      return { ...state, step: action.step, direction: dir };
    }

    default:
      return state;
  }
}
