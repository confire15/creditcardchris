import type { CalculatorAction, CalculatorState, Step } from "./calculator-types";

const STORAGE_PREFIX = "ccc-calculator-state:";
const LAST_ACTIVE_CARD_KEY = "ccc-calculator-last-card";

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

function isPointValuation(value: unknown): value is CalculatorState["pointValuation"] {
  return value === null || value === 0.01 || value === 0.015 || value === 0.02;
}

function isStep(value: unknown): value is Step {
  return value === 1 || value === 2 || value === 3 || value === 4 || value === 5 || value === 6 || value === 7;
}

function isCalculatorState(value: unknown): value is CalculatorState {
  if (!value || typeof value !== "object") return false;
  const state = value as Partial<CalculatorState>;

  return (
    isStep(state.step) &&
    (state.direction === 1 || state.direction === -1) &&
    (typeof state.selectedCardId === "string" || state.selectedCardId === null) &&
    isPointValuation(state.pointValuation) &&
    !!state.monthlySpend &&
    typeof state.monthlySpend.dining === "number" &&
    typeof state.monthlySpend.travel === "number" &&
    typeof state.monthlySpend.groceries === "number" &&
    typeof state.spendMultiplier === "number" &&
    typeof state.diningPicked === "boolean" &&
    typeof state.travelPicked === "boolean" &&
    typeof state.groceriesPicked === "boolean" &&
    !!state.creditUtilization &&
    typeof state.creditUtilization === "object"
  );
}

export function getCalculatorStorageKey(cardId: string) {
  return `${STORAGE_PREFIX}${cardId}`;
}

export function loadPersistedCalculatorState(cardId: string): CalculatorState | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(getCalculatorStorageKey(cardId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return isCalculatorState(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function loadMostRecentCalculatorState(): CalculatorState | null {
  if (typeof window === "undefined") return null;

  const lastCardId = window.localStorage.getItem(LAST_ACTIVE_CARD_KEY);
  if (!lastCardId) return null;
  return loadPersistedCalculatorState(lastCardId);
}

export function persistCalculatorState(state: CalculatorState) {
  if (typeof window === "undefined" || !state.selectedCardId) return;

  try {
    window.localStorage.setItem(
      getCalculatorStorageKey(state.selectedCardId),
      JSON.stringify(state),
    );
    window.localStorage.setItem(LAST_ACTIVE_CARD_KEY, state.selectedCardId);
  } catch {
    // Ignore storage quota/private browsing failures.
  }
}

export function clearPersistedCalculatorState(cardId: string | null) {
  if (typeof window === "undefined" || !cardId) return;

  try {
    window.localStorage.removeItem(getCalculatorStorageKey(cardId));
    if (window.localStorage.getItem(LAST_ACTIVE_CARD_KEY) === cardId) {
      window.localStorage.removeItem(LAST_ACTIVE_CARD_KEY);
    }
  } catch {
    // Ignore storage access failures.
  }
}

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

    case "RESET":
      return initialState;

    default:
      return state;
  }
}
