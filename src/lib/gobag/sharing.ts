import {
  getSummary,
  itemQuantity,
  ownedQuantity,
  quantityLabel,
  type KitState,
} from "./kit";
import { planFields } from "@/data/gobag-guidance";
export function supplyList(
  state: KitState,
  name: string,
  includePlan = false,
  includeLocations = false,
) {
  const lines = [
    `${name} — GoBag supply list`,
    `${state.people} people · ${state.days} days`,
    "",
  ];
  for (const item of getSummary(state).items) {
    lines.push(
      `${item.name}: need ${quantityLabel(item, itemQuantity(item, state))}; own ${ownedQuantity(item, state)}; packed/stored ${state.completed[item.id] ?? 0}${includeLocations && state.locations[item.id] ? `; location: ${state.locations[item.id]}` : ""}`,
    );
  }
  if (includePlan) {
    lines.push("", "Household plan");
    for (const f of planFields)
      if (state.plan[f.id]) lines.push(`${f.label}: ${state.plan[f.id]}`);
  }
  lines.push(
    "",
    "A planning checklist, not a safety guarantee. Follow local emergency guidance.",
    "https://gobag.creditcardchris.com",
  );
  return lines.join("\n");
}
