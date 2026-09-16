import {
  householdNeeds,
  personalizedReminders,
  planFields,
  type HouseholdNeed,
  type PlanField,
} from "@/data/gobag-guidance";
import {
  emergencyItems,
  personalEssentials,
  petItems,
  type EmergencyItem,
} from "@/data/emergency-items";
// Keep the legacy key so returning users retain their saved checklist.
export const STORAGE_KEY = "readykit:v1";
export type KitState = {
  customItems: EmergencyItem[];
  locations: Record<string, string>;
  spending: Record<string, number>;
  budget: number | null;
  compact: boolean;
  combinedRadio: boolean;
  maintenance: { checked: string[]; lastCompleted: string };
  people: number;
  days: 3 | 7 | 14;
  pets: boolean;
  petCount: number;
  mode: "go-bag" | "stay-home";
  completed: Record<string, number>;
  owned: Record<string, number>;
  reviewDates: Record<string, string>;
  needs: HouseholdNeed[];
  plan: Partial<Record<PlanField, string>>;
};
export const defaultKit: KitState = {
  customItems: [],
  locations: {},
  spending: {},
  budget: null,
  compact: false,
  combinedRadio: false,
  maintenance: { checked: [], lastCompleted: "" },
  people: 1,
  days: 3,
  pets: false,
  petCount: 1,
  mode: "go-bag",
  completed: {},
  owned: {},
  reviewDates: {},
  needs: [],
  plan: {},
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
export function ownedQuantity(item: EmergencyItem, state: KitState) {
  return Math.max(state.owned[item.id] ?? 0, state.completed[item.id] ?? 0);
}
export function missingQuantity(item: EmergencyItem, state: KitState) {
  return Math.max(0, itemQuantity(item, state) - ownedQuantity(item, state));
}
export function changeQuantity(
  state: KitState,
  item: EmergencyItem,
  kind: "owned" | "completed",
  value: number,
): KitState {
  const count = Number.isFinite(value)
    ? Math.max(0, Math.min(10000, Math.floor(value)))
    : 0;
  const owned = { ...state.owned, [item.id]: ownedQuantity(item, state) };
  const completed = { ...state.completed };
  if (kind === "owned") {
    owned[item.id] = count;
    completed[item.id] = Math.min(completed[item.id] ?? 0, count);
  } else {
    completed[item.id] = count;
    owned[item.id] = Math.max(owned[item.id], count);
  }
  return { ...state, owned, completed };
}
export function getActiveItems(state: KitState) {
  const base = emergencyItems
    .filter((i) => !state.combinedRadio || i.id !== "noaa-radio")
    .map((i) =>
      state.combinedRadio && i.id === "radio"
        ? {
            ...i,
            name: "Emergency radio with NOAA tone alerts",
            why: "One receiver can cover both emergency broadcasts and NOAA tone alerts. Confirm local coverage, alert features, and power options before marking it ready.",
            description:
              "One receiver covering emergency broadcasts and NOAA tone alerts.",
          }
        : i,
    );
  return [...base, ...(state.pets ? petItems : []), ...state.customItems];
}
export function getSummary(state: KitState) {
  const items = getActiveItems(state);
  const missing = items.filter((item) => missingQuantity(item, state) > 0);
  const unpacked = items.filter((item) => !isPacked(item, state));
  const packed = items.length - unpacked.length;
  // Only quantities still needed contribute to the shopping estimate.
  const min = missing.reduce(
    (sum, item) =>
      sum + (item.estimatedPriceMin ?? 0) * missingQuantity(item, state),
    0,
  );
  const max = missing.reduce(
    (sum, item) =>
      sum + (item.estimatedPriceMax ?? 0) * missingQuantity(item, state),
    0,
  );
  return {
    items,
    missing,
    packed,
    owned: items.length - missing.length,
    unpacked,
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
  const customItems: EmergencyItem[] = [];
  const customIds = new Set<string>();
  if (Array.isArray(saved.customItems))
    for (const item of saved.customItems.slice(0, 100)) {
      if (
        !item ||
        typeof item.id !== "string" ||
        !/^custom-[a-zA-Z0-9-]{1,70}$/.test(item.id) ||
        customIds.has(item.id) ||
        typeof item.name !== "string" ||
        !item.name.trim()
      )
        continue;
      customIds.add(item.id);
      const price =
        typeof item.estimatedPriceMin === "number" &&
        Number.isFinite(item.estimatedPriceMin) &&
        item.estimatedPriceMin >= 0 &&
        item.estimatedPriceMin <= 1000000
          ? item.estimatedPriceMin
          : undefined;
      customItems.push({
        id: item.id,
        name: item.name.trim().slice(0, 100),
        category: "Your additions",
        description: "A supply you added for this kit.",
        why: "Review quantities and suitability for your household.",
        quantityType: "fixed",
        baseQuantity: bounded(item.baseQuantity, 1, 10000),
        unit:
          typeof item.unit === "string" && item.unit.trim()
            ? item.unit.trim().slice(0, 30)
            : "item",
        icon: "tools",
        ...(price !== undefined
          ? { estimatedPriceMin: price, estimatedPriceMax: price }
          : {}),
      });
    }
  const knownIds = new Set(
    [
      ...emergencyItems,
      ...customItems,
      ...petItems,
      ...personalEssentials,
      ...personalizedReminders(householdNeeds.map((n) => n.id)),
    ].map((item) => item.id),
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
        Number.isInteger(count) &&
        count > 0 &&
        count <= 10000
      )
        completed[id] = count;
    }
  }
  const owned: Record<string, number> = { ...completed };
  if (
    saved.owned &&
    typeof saved.owned === "object" &&
    !Array.isArray(saved.owned)
  ) {
    for (const [id, count] of Object.entries(saved.owned)) {
      if (
        knownIds.has(id) &&
        typeof count === "number" &&
        Number.isInteger(count) &&
        count >= 0 &&
        count <= 10000
      )
        owned[id] = Math.max(count, completed[id] ?? 0);
    }
  }
  const reviewDates: Record<string, string> = {};
  if (saved.reviewDates && typeof saved.reviewDates === "object") {
    for (const [id, value] of Object.entries(saved.reviewDates)) {
      if (knownIds.has(id) && isDate(value)) reviewDates[id] = value;
    }
  }
  const plan: Partial<Record<PlanField, string>> = {};
  for (const field of planFields) {
    const value = saved.plan?.[field.id];
    if (typeof value === "string") plan[field.id] = value.slice(0, 500);
  }
  const locations: Record<string, string> = {};
  const spending: Record<string, number> = {};
  for (const id of knownIds) {
    if (typeof saved.locations?.[id] === "string")
      locations[id] = saved.locations[id].slice(0, 120);
    const cost = saved.spending?.[id];
    if (
      typeof cost === "number" &&
      Number.isFinite(cost) &&
      cost >= 0 &&
      cost <= 1000000
    )
      spending[id] = Math.round(cost * 100) / 100;
  }
  return {
    customItems,
    locations,
    spending,
    budget:
      typeof saved.budget === "number" &&
      Number.isFinite(saved.budget) &&
      saved.budget >= 0 &&
      saved.budget <= 1000000
        ? saved.budget
        : null,
    compact: saved.compact === true,
    combinedRadio: saved.combinedRadio === true,
    maintenance: {
      checked: ["food", "water", "lights", "charging", "plan"].filter(
        (id) =>
          Array.isArray(saved.maintenance?.checked) &&
          saved.maintenance.checked.includes(id),
      ),
      lastCompleted: isDate(saved.maintenance?.lastCompleted)
        ? saved.maintenance.lastCompleted
        : "",
    },
    people: bounded(saved.people, 1, 50),
    days: [3, 7, 14].includes(saved.days) ? saved.days : 3,
    pets: saved.pets === true,
    petCount: bounded(saved.petCount, 1, 20),
    mode: saved.mode === "stay-home" ? "stay-home" : "go-bag",
    completed,
    owned,
    reviewDates,
    needs: householdNeeds
      .filter((n) => Array.isArray(saved.needs) && saved.needs.includes(n.id))
      .map((n) => n.id),
    plan,
  };
}

export function isDate(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
  );
}

export function setCombinedRadio(state: KitState, combined: boolean): KitState {
  if (!combined) return { ...state, combinedRadio: false };
  const review = [state.reviewDates.radio, state.reviewDates["noaa-radio"]]
    .filter(Boolean)
    .sort()[0];
  return {
    ...state,
    combinedRadio: true,
    owned: {
      ...state.owned,
      radio: Math.max(
        state.owned.radio ?? 0,
        state.owned["noaa-radio"] ?? 0,
        state.completed.radio ?? 0,
        state.completed["noaa-radio"] ?? 0,
      ),
      "noaa-radio": 0,
    },
    completed: {
      ...state.completed,
      radio: Math.max(
        state.completed.radio ?? 0,
        state.completed["noaa-radio"] ?? 0,
      ),
      "noaa-radio": 0,
    },
    reviewDates: { ...state.reviewDates, ...(review ? { radio: review } : {}) },
    locations: {
      ...state.locations,
      radio: state.locations.radio || state.locations["noaa-radio"] || "",
    },
  };
}
export function totalSpent(state: KitState) {
  return Object.values(state.spending).reduce((n, v) => n + v, 0);
}
