import type { EmergencyItem } from "@/data/emergency-items";
import { itemQuantity, type KitState } from "./kit";

/** Round up so the bottle equivalent never understates the gallon target. */
export function waterBottles(gallons: number) {
  return Math.ceil(gallons * 3.785411784 / 0.5);
}
export function everydayQuantity(item: EmergencyItem, state: KitState) {
  const total = itemQuantity(item, state);
  if (item.id === "water") {
    return `${state.people} ${state.people === 1 ? "person" : "people"} × ${state.days} days × 1 gallon = ${total} gallons. About ${waterBottles(total)} bottles (500 mL each), or ${total} one-gallon jugs. This is the full home supply; carry only a manageable portion if you leave. Some people and pets need extra water.`;
  }
  if (item.id === "food") {
    return `${state.people} ${state.people === 1 ? "person" : "people"} × ${state.days} days = ${total} full days of food for one person. Count meals for a whole day, not package servings. Choose familiar foods that fit your dietary needs.`;
  }
  return "";
}
