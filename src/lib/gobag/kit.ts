import {
  emergencyItems,
  personalEssentials,
  petItems,
  type EmergencyItem,
} from "@/data/emergency-items";
// Keep the legacy key so returning users retain their saved checklist.
export const STORAGE_KEY = "readykit:v1";
export type KitState = {
  people: number;
  days: 3 | 7 | 14;
  pets: boolean;
  petCount: number;
  mode: "go-bag" | "stay-home";
  completed: Record<string, number>;
};
export const defaultKit: KitState = {
  people: 1,
  days: 3,
  pets: false,
  petCount: 1,
  mode: "go-bag",
  completed: {},
};
export function getQuantity(item: EmergencyItem, people: number, days: number) {
  const multipliers = {
    fixed: 1,
    perPerson: people,
    perDay: days,
    perPersonPerDay: people * days,
  };
  return Math.ceil(item.baseQuantity * multipliers[item.quantityType]);
}
export function itemQuantity(item: EmergencyItem, state: KitState) {
  return getQuantity(
    item,
    item.category === "Pet Emergency Kit" ? state.petCount : state.people,
    state.days,
  );
}
export function quantityLabel(item: EmergencyItem, quantity: number) {
  return `${quantity} ${quantity === 1 ? item.unit : (item.pluralUnit ?? `${item.unit}s`)}`;
}
export function isPacked(item: EmergencyItem, state: KitState) {
  return (state.completed[item.id] ?? 0) >= itemQuantity(item, state);
}
export function getActiveItems(state: KitState) {
  return state.pets ? [...emergencyItems, ...petItems] : emergencyItems;
}
export function getSummary(state: KitState) {
  const items = getActiveItems(state);
  const missing = items.filter((item) => !isPacked(item, state));
  const packed = items.length - missing.length;
  // A checkbox confirms the entire displayed quantity. Unchecked lines budget a full replacement.
  const min = missing.reduce(
    (sum, item) =>
      sum + (item.estimatedPriceMin ?? 0) * itemQuantity(item, state),
    0,
  );
  const max = missing.reduce(
    (sum, item) =>
      sum + (item.estimatedPriceMax ?? 0) * itemQuantity(item, state),
    0,
  );
  return {
    items,
    missing,
    packed,
    percent: Math.round((packed / items.length) * 100),
    min,
    max,
    water: state.people * state.days,
  };
}
export function progressLabel(percent: number) {
  return percent === 100
    ? "Go-bag ready"
    : percent > 75
      ? "Nearly prepared"
      : percent > 50
        ? "Almost ready"
        : percent > 25
          ? "Making progress"
          : "Getting started";
}
export const money = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
export const priceRange = (min: number, max: number) =>
  `${money(min)}–${money(max)}`;
export function parseSavedKit(raw: string): KitState {
  const saved = JSON.parse(raw);
  if (!saved || typeof saved !== "object" || Array.isArray(saved))
    throw new Error("Invalid saved checklist");
  const bounded = (n: unknown, fallback: number, max: number) =>
    typeof n === "number" && Number.isInteger(n) && n >= 1 && n <= max
      ? n
      : fallback;
  const knownIds = new Set(
    [...emergencyItems, ...petItems, ...personalEssentials].map(
      (item) => item.id,
    ),
  );
  const completed: Record<string, number> = {};
  if (
    saved.completed &&
    typeof saved.completed === "object" &&
    !Array.isArray(saved.completed)
  ) {
    for (const [id, count] of Object.entries(saved.completed)) {
      if (
        knownIds.has(id) &&
        typeof count === "number" &&
        Number.isFinite(count) &&
        count > 0 &&
        count <= 10000
      )
        completed[id] = count;
    }
  }
  return {
    people: bounded(saved.people, 1, 50),
    days: [3, 7, 14].includes(saved.days) ? saved.days : 3,
    pets: saved.pets === true,
    petCount: bounded(saved.petCount, 1, 20),
    mode: saved.mode === "stay-home" ? "stay-home" : "go-bag",
    completed,
  };
}
