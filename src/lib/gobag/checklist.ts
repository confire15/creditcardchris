import type { EmergencyItem } from "@/data/emergency-items";
import { activeHomeActions } from "./preparation";
import { getSummary, isPacked, missingQuantity, type KitState } from "./kit";

export function supplyStatus(item: EmergencyItem, state: KitState) {
  if (isPacked(item, state)) return "complete" as const;
  if (missingQuantity(item, state) > 0) return "needs-supplies" as const;
  return "ready" as const;
}

/** Keep absent legacy values absent when undoing a one-tap completion. */
export function completionSnapshot(
  state: KitState,
  id: string,
): {
  id: string;
  owned: number | undefined;
  completed: number | undefined;
} {
  return { id, owned: state.owned[id], completed: state.completed[id] };
}

export function restoreCompletion(
  state: KitState,
  snapshot: ReturnType<typeof completionSnapshot>,
): Pick<KitState, "owned" | "completed"> {
  const owned = { ...state.owned };
  const completed = { ...state.completed };
  if (snapshot.owned === undefined) delete owned[snapshot.id];
  else owned[snapshot.id] = snapshot.owned;
  if (snapshot.completed === undefined) delete completed[snapshot.id];
  else completed[snapshot.id] = snapshot.completed;
  return { owned, completed };
}

/** Each active task belongs to exactly one section; saved IDs remain unchanged. */
export function planChecklist(state: KitState) {
  const actions = activeHomeActions(state);
  const safety = actions.filter(action => action.link !== "plan" || action.id === "home-alerts");
  const household = actions.filter(action => action.link === "plan" && action.id !== "home-alerts");
  const supplies = getSummary(state).items;
  const actionCount = (rows: typeof actions) => {
    const applicable = rows.filter(row => !state.notApplicable.includes(row.id));
    return { done: applicable.filter(row => !!state.completed[row.id]).length, total: applicable.length };
  };
  const counts = {
    safety: actionCount(safety),
    supplies: { done: supplies.filter(item => isPacked(item, state)).length, total: supplies.length },
    household: actionCount(household),
  };
  const firstAction = (rows: typeof actions) => rows.find(row => !state.completed[row.id] && !state.notApplicable.includes(row.id));
  const next = firstAction(safety) ?? supplies.find(item => !isPacked(item, state)) ?? firstAction(household);
  const nextSection = safety.some(row => row.id === next?.id) ? "safety"
    : supplies.some(row => row.id === next?.id) ? "supplies" : "household";
  return {
    safety, household, counts, nextId: next?.id, nextSection,
    progress: Object.values(counts).reduce((total, count) => ({ done: total.done + count.done, total: total.total + count.total }), { done: 0, total: 0 }),
  };
}
