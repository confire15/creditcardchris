import type { CalculatorAction, CalculatorState, Step } from "./calculator-types";

export const initialState: CalculatorState = {
  step: 1,
  direction: 1,
  pointValuation: null,
  monthlySpend: { dining: 0, travel: 0, groceries: 0 },
  utilizationFactor: 0,
  spendMultiplier: 1,
  diningPicked: false,
  travelPicked: false,
  equinoxToggled: false,
};

function clampStep(n: number): Step {
  if (n <= 1) return 1;
  if (n >= 4) return 4;
  return n as Step;
}

export function calculatorReducer(
  state: CalculatorState,
  action: CalculatorAction,
): CalculatorState {
  switch (action.type) {
    case "SELECT_VALUATION":
      return {
        ...state,
        pointValuation: action.value,
        step: 2,
        direction: 1,
      };

    case "PICK_DINING": {
      const diningPicked = true;
      const bothPicked = diningPicked && state.travelPicked;
      return {
        ...state,
        monthlySpend: { ...state.monthlySpend, dining: action.monthly },
        diningPicked,
        step: bothPicked ? 3 : state.step,
        direction: bothPicked ? 1 : state.direction,
      };
    }

    case "PICK_TRAVEL": {
      const travelPicked = true;
      const bothPicked = state.diningPicked && travelPicked;
      return {
        ...state,
        monthlySpend: { ...state.monthlySpend, travel: action.monthly },
        travelPicked,
        step: bothPicked ? 3 : state.step,
        direction: bothPicked ? 1 : state.direction,
      };
    }

    case "SET_EQUINOX_TOGGLED":
      return {
        ...state,
        equinoxToggled: action.value,
        utilizationFactor: action.value ? state.utilizationFactor : 0,
      };

    case "SET_UTILIZATION":
      return { ...state, utilizationFactor: action.value };

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
