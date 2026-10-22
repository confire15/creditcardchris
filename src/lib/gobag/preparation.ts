import { personalEssentials } from "@/data/emergency-items";
import { personalizedReminders } from "@/data/gobag-guidance";
import { dueReviews } from "./reminders";
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
export function suggestedExclusions(state: KitState) {
  return homeActions.filter(a => (state.carAccess === "no" && a.id.startsWith("car-") && a.id !== "car-backup") ||
    (!state.pets && a.id === "people-pets") ||
    (state.homeResponsibilities === "no" && ["home-gutters", "home-entry-drains", "home-secure-outdoors"].includes(a.id))).map(a => a.id);
}
export function applicablePersonal(state: KitState) {
  return [...personalEssentials.filter(i => state.personalApplicable.includes(i.id)), ...personalizedReminders(state.needs)];
}
export function preparationProgress(state: KitState) {
  const actions = activeHomeActions(state).filter((a) => !state.notApplicable.includes(a.id));
  const items = getActiveItems(state);
  return {
    done:
      actions.filter((a) => state.completed[a.id]).length +
      items.filter((i) => isPacked(i, state)).length + applicablePersonal(state).filter(i => !!state.completed[i.id]).length,
    total: actions.length + items.length + applicablePersonal(state).length,
  };
}
export function nextSteps(state: KitState) {
  const actions = activeHomeActions(state).filter(a => !state.completed[a.id] && !state.notApplicable.includes(a.id));
  const safety = actions.find(a => a.link !== "plan" || a.id === "home-alerts");
  const household = actions.find(a => a.link === "plan" && a.id !== "home-alerts");
  const supply = getActiveItems(state).filter(i => !isPacked(i, state)).sort((a,b) => Number(priorityOf(b) === "Start here") - Number(priorityOf(a) === "Start here"))[0];
  const personal = applicablePersonal(state).find(i => !state.completed[i.id]);
  const review = dueReviews(state)[0];
  return [
    ...(review ? [{ id: review.id, name: `Review ${review.name}`, group: "review", note: "Needs review" }] : []),
    ...(safety ? [{ ...safety, group: "safety", note: "Safety" }] : []),
    ...(supply ? [{ ...supply, group: "supplies", note: "Supplies" }] : []),
    ...(household ? [{ ...household, group: "household", note: "Household plan" }] : []),
    ...(personal ? [{ ...personal, group: "personal", note: "Personal essentials" }] : []),
  ];
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
