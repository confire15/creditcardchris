import type { SpendingCategory } from "@/lib/types/database";

export const KEYWORD_MAP: Record<string, string> = {
  starbucks: "dining",
  coffee: "dining",
  cafe: "dining",
  restaurant: "dining",
  dinner: "dining",
  lunch: "dining",
  breakfast: "dining",
  bar: "dining",
  food: "dining",
  "fast food": "fast_food",
  mcdonalds: "fast_food",
  burger: "fast_food",
  "taco bell": "fast_food",
  wendy: "fast_food",
  chick: "fast_food",
  grocery: "groceries",
  groceries: "groceries",
  supermarket: "groceries",
  "whole foods": "groceries",
  "trader joe": "groceries",
  kroger: "groceries",
  safeway: "groceries",
  publix: "groceries",
  "costco gas": "gas",
  "sam's club gas": "gas",
  gas: "gas",
  "gas station": "gas",
  shell: "gas",
  chevron: "gas",
  bp: "gas",
  exxon: "gas",
  mobil: "gas",
  "filling station": "gas",
  hotel: "hotels",
  marriott: "hotels",
  hilton: "hotels",
  hyatt: "hotels",
  airbnb: "hotels",
  "four seasons": "hotels",
  flight: "flights",
  airline: "flights",
  delta: "flights",
  united: "flights",
  american: "flights",
  southwest: "flights",
  jetblue: "flights",
  "car rental": "car_rental",
  hertz: "car_rental",
  enterprise: "car_rental",
  avis: "car_rental",
  national: "car_rental",
  uber: "transit",
  lyft: "transit",
  taxi: "transit",
  subway: "transit",
  metro: "transit",
  train: "transit",
  amtrak: "transit",
  netflix: "streaming",
  spotify: "streaming",
  hulu: "streaming",
  disney: "streaming",
  "apple music": "streaming",
  "apple tv": "streaming",
  hbo: "streaming",
  peacock: "streaming",
  amazon: "online_shopping",
  target: "online_shopping",
  walmart: "online_shopping",
  "best buy": "online_shopping",
  ebay: "online_shopping",
  etsy: "online_shopping",
  cvs: "drugstores",
  walgreens: "drugstores",
  pharmacy: "drugstores",
  "rite aid": "drugstores",
  "home depot": "home_improvement",
  lowe: "home_improvement",
  hardware: "home_improvement",
  concert: "entertainment",
  movie: "entertainment",
  theater: "entertainment",
  amc: "entertainment",
  ticketmaster: "entertainment",
  costco: "wholesale_clubs",
  "sam's club": "wholesale_clubs",
  "bj's": "wholesale_clubs",
  gym: "gym_fitness",
  fitness: "gym_fitness",
  "planet fitness": "gym_fitness",
  equinox: "gym_fitness",
  peloton: "gym_fitness",
  electric: "utilities",
  utilities: "utilities",
  internet: "utilities",
  "cell phone": "utilities",
  wireless: "utilities",
  verizon: "utilities",
};

export function classifyByKeyword(
  query: string,
  categories: SpendingCategory[]
): { categoryId: string | null; matchedKeyword: string | null } {
  const normalized = query.toLowerCase();
  const matchedKeyword = Object.keys(KEYWORD_MAP)
    .filter((keyword) => normalized.includes(keyword))
    .sort((a, b) => b.length - a.length)[0];

  if (!matchedKeyword) return { categoryId: null, matchedKeyword: null };

  const categoryName = KEYWORD_MAP[matchedKeyword];
  const category = categories.find((c) => c.name === categoryName);

  return {
    categoryId: category?.id ?? null,
    matchedKeyword,
  };
}

export function parseAmountFromQuery(query: string): number | null {
  const match = query.match(/\$(\d+(?:\.\d{1,2})?)\b|\b(\d+(?:\.\d{1,2})?)\s*(?:dollars?|bucks?)\b/i);
  if (!match) return null;

  const value = Number.parseFloat(match[1] ?? match[2]);
  return Number.isFinite(value) ? value : null;
}
