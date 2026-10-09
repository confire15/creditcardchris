import { homeActions } from "@/data/gobag-preparation";
import { priorityOf } from "@/data/gobag-guidance";
import { getActiveItems, isPacked, type KitState } from "./kit";
export function activeHomeActions(state: KitState) {
  const relevant = (action: (typeof homeActions)[number]) =>
    action.concerns.some((c) =>
      state.concerns.some((selected) => selected === c),
    );
  return homeActions
    .filter(
      (a) =>
        a.general ||
        !a.concerns.length ||
        relevant(a),
    )
    .sort((a, b) => {
      const rank = (action: (typeof homeActions)[number]) =>
        action.id === "home-alerts" ? 0 : relevant(action) ? 1 : 2;
      return rank(a) - rank(b);
    });
}
export function preparationProgress(state: KitState) {
  const actions = activeHomeActions(state).filter((a) => !state.notApplicable.includes(a.id));
  const items = getActiveItems(state);
  return {
    done:
      actions.filter((a) => state.completed[a.id]).length +
      items.filter((i) => isPacked(i, state)).length,
    total: actions.length + items.length,
  };
}
export function nextSteps(state: KitState) {
  return [
    ...activeHomeActions(state)
      .filter((a) => !state.completed[a.id] && !state.notApplicable.includes(a.id))
      .map((a) => ({
        id: a.id,
        name: a.name,
        group: "Get prepared",
        note: a.group,
      })),
    ...getActiveItems(state)
      .filter((i) => !isPacked(i, state))
      .sort(
        (a, b) =>
          Number(priorityOf(b) === "Start here") -
          Number(priorityOf(a) === "Start here"),
      )
      .map((i) => ({
        id: i.id,
        name: i.name,
        group: "Your supplies",
        note: "Check what you own, then pack or store it",
      })),
  ].slice(0, 3);
}

export type PreparationFilter = "All" | "To do" | "Done" | "Not applicable";
export function matchesPreparation(action: (typeof homeActions)[number], state: KitState, search: string, filter: PreparationFilter) {
  const excluded = state.notApplicable.includes(action.id);
  const status = excluded ? "Not applicable" : state.completed[action.id] ? "Done" : "To do";
  return `${action.name} ${action.group} ${action.why} ${action.concerns.join(" ")}`.toLowerCase().includes(search.trim().toLowerCase()) && (filter === "All" || status === filter);
}
export function setPreparationApplicable(state: KitState, id: string, applicable: boolean): KitState {
  if (!homeActions.some((action) => action.id === id)) return state;
  return { ...state, notApplicable: applicable ? state.notApplicable.filter((value) => value !== id) : [...new Set([...state.notApplicable, id])] };
}
