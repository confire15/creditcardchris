"use client";

import { useReducer, useCallback, useEffect, useMemo } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { calculatorReducer, initialState } from "./calculator-reducer";
import type { CalculatorState, PointValuation, Step } from "./calculator-types";
import { StepPickCard } from "./step-pick-card";
import { StepSorter } from "./step-sorter";
import { StepSpendQuestion, type SpendQuestionKey } from "./step-spend-question";
import { StepRealityCheck } from "./step-reality-check";
import { StepResults } from "./step-results";
import { getCardById, type PremiumCard } from "./premium-cards";

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

const OPTIONAL_KEYS: SpendQuestionKey[] = ["hotels", "gas", "transit"];

function getExtraQuestions(card: PremiumCard | null): SpendQuestionKey[] {
  if (!card) return [];
  return OPTIONAL_KEYS.filter((k) => {
    const rate = card.rates[k];
    return typeof rate === "number" && rate > 1;
  });
}

export function WizardLayout() {
  const [state, dispatch] = useReducer(calculatorReducer, initialState);
  const selectedCard = getCardById(state.selectedCardId);

  const extras = useMemo(
    () => getExtraQuestions(selectedCard),
    [selectedCard],
  );
  const realityStep = (6 + extras.length) as Step;
  const resultsStep = (7 + extras.length) as Step;
  const totalSteps = 7 + extras.length;

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

  const handlePickHotels = useCallback((monthly: number) => {
    dispatch({ type: "PICK_HOTELS", monthly });
  }, []);

  const handlePickGas = useCallback((monthly: number) => {
    dispatch({ type: "PICK_GAS", monthly });
  }, []);

  const handlePickTransit = useCallback((monthly: number) => {
    dispatch({ type: "PICK_TRANSIT", monthly });
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
    dispatch({ type: "GOTO", step: 1 });
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowLeft" && state.step > 1) {
        e.preventDefault();
        handleBack();
      } else if (
        e.key === "ArrowRight" &&
        canGoForward(state.step, state, extras, realityStep)
      ) {
        e.preventDefault();
        handleNext();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [state, handleBack, handleNext, extras, realityStep]);

  function getExtraQuestionByStep(step: number) {
    const extraIdx = step - 6; // step 6 = first extra
    if (extraIdx < 0 || extraIdx >= extras.length) return null;
    return extras[extraIdx];
  }

  function pickedFlagFor(key: SpendQuestionKey): boolean {
    if (key === "hotels") return state.hotelsPicked;
    if (key === "gas") return state.gasPicked;
    if (key === "transit") return state.transitPicked;
    return false;
  }

  function spendFor(key: SpendQuestionKey): number {
    return state.monthlySpend[key];
  }

  function pickHandlerFor(key: SpendQuestionKey) {
    if (key === "hotels") return handlePickHotels;
    if (key === "gas") return handlePickGas;
    if (key === "transit") return handlePickTransit;
    return () => {};
  }

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

          <ProgressDots current={state.step} total={totalSteps} />

          <div className="text-xs text-muted-foreground tabular-nums w-[44px] text-right">
            {state.step} / {totalSteps}
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
                  stepNumber={3}
                  onPick={handlePickDining}
                />
              )}
              {state.step === 4 && (
                <StepSpendQuestion
                  questionKey="travel"
                  monthly={state.monthlySpend.travel}
                  picked={state.travelPicked}
                  stepNumber={4}
                  onPick={handlePickTravel}
                />
              )}
              {state.step === 5 && (
                <StepSpendQuestion
                  questionKey="groceries"
                  monthly={state.monthlySpend.groceries}
                  picked={state.groceriesPicked}
                  stepNumber={5}
                  onPick={handlePickGroceries}
                />
              )}
              {state.step >= 6 &&
                state.step < realityStep &&
                (() => {
                  const key = getExtraQuestionByStep(state.step);
                  if (!key) return null;
                  return (
                    <StepSpendQuestion
                      questionKey={key}
                      monthly={spendFor(key)}
                      picked={pickedFlagFor(key)}
                      stepNumber={state.step}
                      onPick={pickHandlerFor(key)}
                    />
                  );
                })()}
              {state.step === realityStep && selectedCard && (
                <StepRealityCheck
                  card={selectedCard}
                  creditUtilization={state.creditUtilization}
                  onSetCreditUtilization={handleSetCreditUtilization}
                  onContinue={handleNext}
                />
              )}
              {state.step === resultsStep && selectedCard && (
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

function canGoForward(
  step: Step,
  state: CalculatorState,
  extras: SpendQuestionKey[],
  realityStep: Step,
): boolean {
  if (step === 1) return state.selectedCardId !== null;
  if (step === 2) return state.pointValuation !== null;
  if (step === 3) return state.diningPicked;
  if (step === 4) return state.travelPicked;
  if (step === 5) return state.groceriesPicked;
  if (step >= 6 && step < realityStep) {
    const key = extras[step - 6];
    if (key === "hotels") return state.hotelsPicked;
    if (key === "gas") return state.gasPicked;
    if (key === "transit") return state.transitPicked;
    return false;
  }
  if (step === realityStep) return true;
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
