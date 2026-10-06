import { homeActions } from "@/data/gobag-preparation";
import { priorityOf } from "@/data/gobag-guidance";
import { getActiveItems, isPacked, type KitState } from "./kit";
export function activeHomeActions(state: KitState) {
  const relevant = (action: (typeof homeActions)[number]) =>
    action.concerns.some((c) =>
      state.concerns.some((selected) => selected === c),
    );
  return homeActions
    .filter((a) => !a.concerns.length || relevant(a) || a.id === "home-lights")
    .sort((a, b) => {
      const rank = (action: (typeof homeActions)[number]) =>
        action.id === "home-alerts" ? 0 : relevant(action) ? 1 : 2;
      return rank(a) - rank(b);
    });
}
export function preparationProgress(state: KitState) {
  const actions = activeHomeActions(state);
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
      .filter((a) => !state.completed[a.id])
      .map((a) => ({
        id: a.id,
        name: a.name,
        group: "Prepare your home",
        note: "Start with what you have",
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
