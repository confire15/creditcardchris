// US average monthly spending estimates by category (BLS Consumer Expenditure Survey)
// Used as fallback when user hasn't entered custom spending
export const DEFAULT_MONTHLY_SPEND: Record<string, number> = {
  dining: 250,
  fast_food: 100,
  travel: 150,
  groceries: 500,
  gas: 200,
  streaming: 50,
  online_shopping: 200,
  transit: 75,
  drugstores: 50,
  home_improvement: 100,
  entertainment: 75,
  hotels: 50,
  flights: 75,
  car_rental: 25,
  wholesale_clubs: 100,
  gym_fitness: 50,
  utilities: 250,
  other: 125,
};

// CPP (cents per point) defaults by reward unit
export const DEFAULT_CPP: Record<string, number> = {
  "cash back": 1.0,
  cashback: 1.0,
  "Cash Back": 1.0,
  "Ultimate Rewards": 1.5,
  "Membership Rewards": 1.5,
  "Capital One Miles": 1.0,
  Miles: 1.3,
  miles: 1.3,
  "ThankYou Points": 1.5,
  "Venture Miles": 1.0,
  "Hilton Honors": 0.6,
  "Marriott Bonvoy": 0.7,
  "World of Hyatt": 1.7,
  "Delta SkyMiles": 1.2,
  "United MileagePlus": 1.3,
  "Southwest Rapid Rewards": 1.4,
  "IHG Rewards": 0.5,
};

export function getDefaultCpp(rewardUnit: string): number {
  return DEFAULT_CPP[rewardUnit] ?? 1.0;
}
