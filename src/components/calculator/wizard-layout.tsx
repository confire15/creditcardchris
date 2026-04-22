"use client";

import { useReducer, useCallback, useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { calculatorReducer, initialState } from "./calculator-reducer";
import type { CalculatorState, PointValuation, Step } from "./calculator-types";
import { StepPickCard } from "./step-pick-card";
import { StepSorter } from "./step-sorter";
import { StepSpendQuestion } from "./step-spend-question";
import { StepRealityCheck } from "./step-reality-check";
import { StepResults } from "./step-results";
import { getCardById } from "./premium-cards";

const TOTAL_STEPS = 7;
const STORAGE_PREFIX = "cc-calculator";
const ACTIVE_CARD_KEY = `${STORAGE_PREFIX}:active-card`;

const slideVariants = {
  enter: (direction: 1 | -1) => ({
    x: direction > 0 ? 64 : -64,
    opacity: 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (direction: 1 | -1) => ({
    x: direction > 0 ? -64 : 64,
    opacity: 0,
  }),
};

export function WizardLayout() {
  const [state, dispatch] = useReducer(calculatorReducer, initialState);
  const selectedCard = getCardById(state.selectedCardId);

  useEffect(() => {
    const activeCardId = window.localStorage.getItem(ACTIVE_CARD_KEY);
    if (!activeCardId) return;

    const stored = window.localStorage.getItem(storageKeyForCard(activeCardId));
    const parsed = parseStoredState(stored);
    if (!parsed) return;

    dispatch({ type: "HYDRATE", state: parsed });
  }, []);

  useEffect(() => {
    if (!state.selectedCardId || state.step === 7) return;
    window.localStorage.setItem(ACTIVE_CARD_KEY, state.selectedCardId);
    window.localStorage.setItem(storageKeyForCard(state.selectedCardId), JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    if (!state.selectedCardId || state.step !== 7) return;
    window.localStorage.removeItem(storageKeyForCard(state.selectedCardId));
    if (window.localStorage.getItem(ACTIVE_CARD_KEY) === state.selectedCardId) {
      window.localStorage.removeItem(ACTIVE_CARD_KEY);
    }
  }, [state.selectedCardId, state.step]);

  const handleSelectCard = useCallback((cardId: string) => {
    dispatch({ type: "SELECT_CARD", cardId });
  }, []);

  const handleSelectValuation = useCallback((value: PointValuation) => {
    dispatch({ type: "SELECT_VALUATION", value });
  }, []);

  const handlePickDining = useCallback((monthly: number) => {
    dispatch({ type: "PICK_DINING", monthly });
  }, []);

  const handlePickTravel = useCallback((monthly: number) => {
    dispatch({ type: "PICK_TRAVEL", monthly });
  }, []);

  const handlePickGroceries = useCallback((monthly: number) => {
    dispatch({ type: "PICK_GROCERIES", monthly });
  }, []);

  const handleSetCreditUtilization = useCallback(
    (creditId: string, value: number) => {
      dispatch({ type: "SET_CREDIT_UTILIZATION", creditId, value });
    },
    [],
  );

  const handleSetSpendMultiplier = useCallback((value: number) => {
    dispatch({ type: "SET_SPEND_MULTIPLIER", value });
  }, []);

  const handleBack = useCallback(() => {
    dispatch({ type: "BACK" });
  }, []);

  const handleNext = useCallback(() => {
    dispatch({ type: "NEXT" });
  }, []);

  const handleRestart = useCallback(() => {
    dispatch({ type: "RESET" });
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowLeft" && state.step > 1) {
        e.preventDefault();
        handleBack();
      } else if (e.key === "ArrowRight" && canGoForward(state.step, state)) {
        e.preventDefault();
        handleNext();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [state, handleBack, handleNext]);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-xl px-4 sm:px-6 pt-4 pb-24">
        <h1 className="text-2xl font-bold tracking-tight mb-2">Fee Calculator</h1>
        <header className="flex items-center justify-between gap-4 pb-4">
          <button
            type="button"
            onClick={handleBack}
            disabled={state.step === 1}
            aria-label="Previous step"
            className={cn(
              "flex items-center gap-1 text-sm rounded-lg px-2 py-1.5 transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              state.step === 1
                ? "text-muted-foreground/40 cursor-not-allowed"
                : "text-muted-foreground hover:text-foreground hover:bg-overlay-hover",
            )}
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>

          <ProgressDots current={state.step} total={TOTAL_STEPS} />

          <div className="text-xs text-muted-foreground tabular-nums w-[44px] text-right">
            {state.step} / {TOTAL_STEPS}
          </div>
        </header>

        <main className="relative overflow-hidden">
          <AnimatePresence mode="wait" custom={state.direction} initial={false}>
            <motion.div
              key={state.step}
              custom={state.direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: "spring", stiffness: 350, damping: 35 },
                opacity: { duration: 0.18 },
              }}
            >
              {state.step === 1 && (
                <StepPickCard
                  selectedCardId={state.selectedCardId}
                  onSelect={handleSelectCard}
                />
              )}
              {state.step === 2 && (
                <StepSorter
                  selected={state.pointValuation}
                  onSelect={handleSelectValuation}
                />
              )}
              {state.step === 3 && (
                <StepSpendQuestion
                  questionKey="dining"
                  monthly={state.monthlySpend.dining}
                  picked={state.diningPicked}
                  onPick={handlePickDining}
                />
              )}
              {state.step === 4 && (
                <StepSpendQuestion
                  questionKey="travel"
                  monthly={state.monthlySpend.travel}
                  picked={state.travelPicked}
                  onPick={handlePickTravel}
                />
              )}
              {state.step === 5 && (
                <StepSpendQuestion
                  questionKey="groceries"
                  monthly={state.monthlySpend.groceries}
                  picked={state.groceriesPicked}
                  onPick={handlePickGroceries}
                />
              )}
              {state.step === 6 && selectedCard && (
                <StepRealityCheck
                  card={selectedCard}
                  creditUtilization={state.creditUtilization}
                  onSetCreditUtilization={handleSetCreditUtilization}
                  onContinue={handleNext}
                />
              )}
              {state.step === 7 && selectedCard && (
                <StepResults
                  state={state}
                  card={selectedCard}
                  onSetSpendMultiplier={handleSetSpendMultiplier}
                  onRestart={handleRestart}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

function storageKeyForCard(cardId: string): string {
  return `${STORAGE_PREFIX}:${cardId}`;
}

function parseStoredState(raw: string | null): CalculatorState | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<CalculatorState>;
    if (!parsed || typeof parsed !== "object") return null;
    if (typeof parsed.selectedCardId !== "string" || parsed.selectedCardId.length === 0) return null;

    return {
      step: clampStep(Number(parsed.step)),
      direction: parsed.direction === -1 ? -1 : 1,
      selectedCardId: parsed.selectedCardId,
      pointValuation: isPointValuation(parsed.pointValuation) ? parsed.pointValuation : null,
      monthlySpend: {
        dining: toNonNegativeNumber(parsed.monthlySpend?.dining),
        travel: toNonNegativeNumber(parsed.monthlySpend?.travel),
        groceries: toNonNegativeNumber(parsed.monthlySpend?.groceries),
      },
      spendMultiplier: toNonNegativeNumber(parsed.spendMultiplier, 1),
      diningPicked: Boolean(parsed.diningPicked),
      travelPicked: Boolean(parsed.travelPicked),
      groceriesPicked: Boolean(parsed.groceriesPicked),
      creditUtilization:
        parsed.creditUtilization && typeof parsed.creditUtilization === "object"
          ? parsed.creditUtilization
          : {},
    };
  } catch {
    return null;
  }
}

function clampStep(value: number): Step {
  if (!Number.isFinite(value) || value < 1) return 1;
  if (value > 7) return 7;
  return value as Step;
}

function isPointValuation(value: unknown): value is PointValuation {
  return value === 0.01 || value === 0.015 || value === 0.02;
}

function toNonNegativeNumber(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return n;
}

function canGoForward(step: Step, state: CalculatorState): boolean {
  if (step === 1) return state.selectedCardId !== null;
  if (step === 2) return state.pointValuation !== null;
  if (step === 3) return state.diningPicked;
  if (step === 4) return state.travelPicked;
  if (step === 5) return state.groceriesPicked;
  if (step === 6) return true;
  return false;
}

function ProgressDots({
  current,
  total,
}: {
  current: number;
  total: number;
}) {
  return (
    <div
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={total}
      aria-valuenow={current}
      aria-label={`Step ${current} of ${total}`}
      className="flex items-center gap-1.5 flex-1 max-w-[180px] justify-center"
    >
      {Array.from({ length: total }).map((_, i) => {
        const stepNumber = i + 1;
        const isActive = stepNumber === current;
        const isComplete = stepNumber < current;
        return (
          <span
            key={i}
            className={cn(
              "h-1.5 rounded-full transition-all",
              isActive
                ? "w-6 bg-primary"
                : isComplete
                  ? "w-4 bg-primary/70"
                  : "w-4 bg-muted",
            )}
          />
        );
      })}
    </div>
  );
}
