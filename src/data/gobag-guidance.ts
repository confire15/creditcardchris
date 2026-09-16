import type { EmergencyItem } from "./emergency-items";

export const guidanceReviewed = "2026-09-16";
export const guidanceSources = [
  { label: "Ready.gov: build a kit", url: "https://www.ready.gov/kit" },
  { label: "Ready.gov: make a plan", url: "https://www.ready.gov/plan" },
  {
    label: "CDC: emergency water storage",
    url: "https://www.cdc.gov/water-emergency/about/how-to-create-and-store-an-emergency-water-supply.html",
  },
  {
    label: "National Institute on Aging: disaster preparedness",
    url: "https://www.nia.nih.gov/health/safety/disaster-preparedness-and-recovery-older-adults",
  },
];
export const householdNeeds = [
  {
    id: "infants",
    label: "Infants / young children",
    reminders: [
      "Diapers, feeding supplies, and familiar food",
      "Comfort item and a change of clothing",
    ],
  },
  {
    id: "older-adults",
    label: "Older adults",
    reminders: [
      "Glasses, hearing aids, and compatible spare batteries",
      "Arrange a check-in person and transportation",
    ],
  },
  {
    id: "accessibility",
    label: "Accessibility / support needs",
    reminders: [
      "Mobility and communication aids with backup supplies",
      "Plan assistance and equipment power needs with your support network",
    ],
  },
  {
    id: "dietary",
    label: "Dietary restrictions",
    reminders: [
      "Check food labels for allergens and dietary needs",
      "Choose familiar food you can prepare with available water and tools",
    ],
  },
] as const;
export type HouseholdNeed = (typeof householdNeeds)[number]["id"];
export function personalizedReminders(needs: readonly string[]) {
  return householdNeeds
    .filter((n) => needs.includes(n.id))
    .flatMap((n) =>
      n.reminders.map((name, index) => ({ id: `need-${n.id}-${index}`, name })),
    );
}
const startIds = new Set([
  "water",
  "food",
  "flashlight",
  "first-aid",
  "radio",
  "batteries",
  "power-bank",
  "cables",
  "pet-food",
  "pet-water",
]);
const reserveIds = new Set([
  "water",
  "food",
  "sheeting",
  "tape",
  "scissors",
  "bags",
  "ties",
  "wrench",
  "can-opener",
  "pet-food",
  "pet-water",
]);
export const priorityOf = (item: EmergencyItem) =>
  startIds.has(item.id) ? "Start here" : "Add next";
export const storageOf = (item: EmergencyItem) =>
  reserveIds.has(item.id) ? "Home reserves" : "Carry essentials";
const buyingGuidance: Record<string, string> = {
  Water:
    "Compare total gallons, not bottle count. Choose sealed drinking water or containers intended for drinking-water storage. Check filled weight and storage directions.",
  Food: "Compare full days of food, calories, allergens, expiration dates, and preparation needs. A package serving is not necessarily a meal.",
  "Bag / Carry":
    "Check the empty weight, adjustable straps, usable capacity, and weather resistance. Try the loaded bag before deciding what you can carry.",
  Communication:
    "Check reception in your area, tone-alert support, and power options. One radio with both features can cover both radio entries.",
  Lighting:
    "Compare runtime, battery type, weight, and ease of operation. Choose batteries compatible with your other devices when practical.",
  Medical:
    "Check the contents and expiration dates against your household needs. Review instructions and arrange personal medical supplies with your clinician.",
  Power:
    "Match battery sizes, phone connectors, and charging power to your devices. Compare usable capacity and weight; follow storage and charging instructions.",
  Signaling:
    "Choose a lightweight whistle that is easy to use and attach securely to your bag.",
  "Air / Protection":
    "Check the intended particulate protection, sizing, fit instructions, and manufacturer labeling. Masks do not address every airborne hazard.",
  Shelter:
    "Match dimensions to your storage space and local shelter guidance. Check roll sizes and safe storage for cutting tools.",
  Sanitation:
    "Compare pack counts, bag capacity, and durability. Choose products suitable for their stated use and your household.",
  "Utilities / Tools":
    "Ask your utility which tools, if any, belong in your kit. Choose a manageable size; follow local guidance rather than attempting unfamiliar utility work.",
  "Food preparation":
    "Choose a manual opener that your household can operate. Check it with the cans you store.",
  Navigation:
    "Choose maps covering your actual area. Obtain current evacuation maps from your local emergency management agency.",
  "Communication / Phone":
    "Match connectors and charging specifications to every device, adapter, and power bank. Check cable length and durability.",
  "Pet Emergency Kit":
    "Choose food and equipment for your animal’s size and daily needs. Check fit, carrier dimensions, and familiar food portions.",
};
export const buyingTips = (item: EmergencyItem) =>
  buyingGuidance[item.category];
export const planFields = [
  { id: "nearbyMeeting", label: "Nearby meeting place" },
  { id: "outsideMeeting", label: "Meeting place outside your neighborhood" },
  { id: "emergencyContact", label: "Emergency contact and phone" },
  { id: "outOfAreaContact", label: "Out-of-area contact and phone" },
  {
    id: "evacuation",
    label: "Evacuation routes / where to find your printed map",
  },
  {
    id: "assistance",
    label: "Transportation, pets, and assistance arrangements",
  },
] as const;
export type PlanField = (typeof planFields)[number]["id"];
