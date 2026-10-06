import type { KitState } from "./kit";

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
