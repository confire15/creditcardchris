import type { LucideIcon } from "lucide-react";
import {
  Plane,
  Hotel,
  Dumbbell,
  Music,
  MapPin,
  Utensils,
  Gift,
  Car,
  BedDouble,
  ShieldCheck,
  Sparkles,
  Building2,
} from "lucide-react";

export type PremiumCardCredit = {
  id: string;
  name: string;
  amount: number;
  icon: LucideIcon;
  copy: string;
};

export type PremiumCardRates = {
  dining: number;
  travel: number; // interpreted as flights for rate lookup
  groceries: number;
  hotels?: number;
  gas?: number;
  transit?: number;
};

export type PremiumCard = {
  id: string;
  name: string;
  shortName: string;
  issuer: string;
  rewardUnit: string;
  annualFee: number;
  color: string;
  tagline: string;
  credits: PremiumCardCredit[];
  rates: PremiumCardRates;
};

export const PREMIUM_CARDS: PremiumCard[] = [
  {
    id: "amex-platinum",
    name: "Amex Platinum",
    shortName: "Platinum",
    issuer: "American Express",
    rewardUnit: "Membership Rewards",
    annualFee: 895,
    color: "#8a8a8a",
    tagline: "The lounge king.",
    credits: [
      {
        id: "amex-plat-airline",
        name: "Airline fee credit",
        amount: 200,
        icon: Plane,
        copy: "Seat fees, bags, or gift cards on one airline.",
      },
      {
        id: "amex-plat-hotel",
        name: "FHR hotel credit",
        amount: 200,
        icon: Hotel,
        copy: "Prepaid FHR or The Hotel Collection stays.",
      },
      {
        id: "amex-plat-equinox",
        name: "Equinox credit",
        amount: 300,
        icon: Dumbbell,
        copy: "Membership, app, or SoulCycle at-home.",
      },
      {
        id: "amex-plat-digital",
        name: "Digital entertainment",
        amount: 240,
        icon: Music,
        copy: "$20/mo across NYT, Disney+, Hulu, Peacock.",
      },
    ],
    rates: { dining: 1, travel: 5, groceries: 1 },
  },
  {
    id: "chase-sapphire-reserve",
    name: "Chase Sapphire Reserve",
    shortName: "Reserve",
    issuer: "Chase",
    rewardUnit: "Ultimate Rewards",
    annualFee: 550,
    color: "#1a1a2e",
    tagline: "The travel classic.",
    credits: [
      {
        id: "csr-travel",
        name: "Travel credit",
        amount: 300,
        icon: MapPin,
        copy: "Auto-applies to the first $300 of travel charges.",
      },
      {
        id: "csr-doordash",
        name: "DashPass & DoorDash",
        amount: 120,
        icon: Utensils,
        copy: "DashPass + monthly DoorDash credits (rough).",
      },
    ],
    rates: { dining: 3, travel: 3, groceries: 1 },
  },
  {
    id: "capital-one-venture-x",
    name: "Capital One Venture X",
    shortName: "Venture X",
    issuer: "Capital One",
    rewardUnit: "Capital One Miles",
    annualFee: 395,
    color: "#003d6b",
    tagline: "The low-fee premium.",
    credits: [
      {
        id: "venturex-travel",
        name: "Capital One Travel credit",
        amount: 300,
        icon: Plane,
        copy: "Must book through Capital One Travel.",
      },
      {
        id: "venturex-anniversary",
        name: "Anniversary miles",
        amount: 200,
        icon: Gift,
        copy: "10,000 miles every year, ~1¢ each.",
      },
    ],
    rates: { dining: 2, travel: 5, groceries: 2 },
  },
  {
    id: "amex-gold",
    name: "Amex Gold",
    shortName: "Gold",
    issuer: "American Express",
    rewardUnit: "Membership Rewards",
    annualFee: 325,
    color: "#b8860b",
    tagline: "The foodie card.",
    credits: [
      {
        id: "gold-dining",
        name: "Dining credit",
        amount: 120,
        icon: Utensils,
        copy: "$10/mo at Shake Shack, Grubhub, Resy, etc.",
      },
      {
        id: "gold-uber",
        name: "Uber Cash",
        amount: 120,
        icon: Car,
        copy: "$10/mo in Uber/Uber Eats — use it or lose it.",
      },
    ],
    rates: { dining: 4, travel: 3, groceries: 4 },
  },
  {
    id: "chase-sapphire-preferred",
    name: "Chase Sapphire Preferred",
    shortName: "Preferred",
    issuer: "Chase",
    rewardUnit: "Ultimate Rewards",
    annualFee: 95,
    color: "#1a3c6e",
    tagline: "The starter card.",
    credits: [
      {
        id: "csp-hotel",
        name: "Hotel credit",
        amount: 50,
        icon: BedDouble,
        copy: "$50 via Chase Travel on hotels, once a year.",
      },
    ],
    rates: { dining: 3, travel: 2, groceries: 1 },
  },
  {
    id: "citi-strata-premier",
    name: "Citi Strata Premier",
    shortName: "Strata Premier",
    issuer: "Citi",
    rewardUnit: "ThankYou Points",
    annualFee: 95,
    color: "#1f4e79",
    tagline: "The hotel multiplier sleeper.",
    credits: [
      {
        id: "strata-hotel",
        name: "Annual hotel credit",
        amount: 100,
        icon: Hotel,
        copy: "$100 off a single $500+ hotel via Citi Travel.",
      },
    ],
    rates: { dining: 3, travel: 3, groceries: 3, hotels: 10, gas: 3 },
  },
  {
    id: "boa-premium-rewards-elite",
    name: "BoA Premium Rewards Elite",
    shortName: "PRE",
    issuer: "Bank of America",
    rewardUnit: "Cash Back",
    annualFee: 550,
    color: "#0a2540",
    tagline: "The Preferred Rewards play.",
    credits: [
      {
        id: "pre-airline",
        name: "Airline incidental credit",
        amount: 300,
        icon: Plane,
        copy: "$300/yr on incidental airline charges.",
      },
      {
        id: "pre-lifestyle",
        name: "Lifestyle credit",
        amount: 150,
        icon: Sparkles,
        copy: "$150/yr on streaming, rideshare, food delivery, fitness.",
      },
    ],
    rates: { dining: 2, travel: 2, groceries: 1 },
  },
  {
    id: "us-bank-altitude-reserve",
    name: "US Bank Altitude Reserve",
    shortName: "Altitude Reserve",
    issuer: "U.S. Bank",
    rewardUnit: "Altitude Points",
    annualFee: 400,
    color: "#102a43",
    tagline: "The mobile-wallet workhorse.",
    credits: [
      {
        id: "altres-travel-dining",
        name: "Travel & dining credit",
        amount: 325,
        icon: MapPin,
        copy: "Auto-applies to travel/dining purchases.",
      },
      {
        id: "altres-priority-pass",
        name: "Priority Pass (4 visits)",
        amount: 100,
        icon: ShieldCheck,
        copy: "4 free Priority Pass visits per year.",
      },
    ],
    rates: { dining: 3, travel: 3, groceries: 1, hotels: 5 },
  },
  {
    id: "wells-fargo-autograph-journey",
    name: "Wells Fargo Autograph Journey",
    shortName: "Autograph Journey",
    issuer: "Wells Fargo",
    rewardUnit: "Rewards Points",
    annualFee: 95,
    color: "#b91c1c",
    tagline: "The hotel-heavy underdog.",
    credits: [],
    rates: { dining: 3, travel: 4, groceries: 1, hotels: 5 },
  },
  {
    id: "amex-green",
    name: "Amex Green",
    shortName: "Green",
    issuer: "American Express",
    rewardUnit: "Membership Rewards",
    annualFee: 150,
    color: "#1f6f4a",
    tagline: "The transit-and-travel triple.",
    credits: [
      {
        id: "green-clear",
        name: "CLEAR Plus credit",
        amount: 209,
        icon: ShieldCheck,
        copy: "$209/yr toward CLEAR Plus membership.",
      },
      {
        id: "green-loungebuddy",
        name: "LoungeBuddy credit",
        amount: 100,
        icon: Building2,
        copy: "$100/yr in LoungeBuddy lounge passes.",
      },
    ],
    rates: { dining: 3, travel: 3, groceries: 1, transit: 3 },
  },
  {
    id: "marriott-bonvoy-brilliant",
    name: "Marriott Bonvoy Brilliant",
    shortName: "Brilliant",
    issuer: "American Express",
    rewardUnit: "Bonvoy Points",
    annualFee: 650,
    color: "#3a3a3a",
    tagline: "The Marriott loyalist's pick.",
    credits: [
      {
        id: "brilliant-dining",
        name: "Brilliant dining credit",
        amount: 300,
        icon: Utensils,
        copy: "$25/mo at restaurants worldwide.",
      },
      {
        id: "brilliant-free-night",
        name: "Free night award (~85k)",
        amount: 400,
        icon: BedDouble,
        copy: "Annual free-night certificate, conservative cash value.",
      },
    ],
    rates: { dining: 4, travel: 4, groceries: 1, hotels: 6 },
  },
];

export function getCardById(id: string | null): PremiumCard | null {
  if (!id) return null;
  return PREMIUM_CARDS.find((c) => c.id === id) ?? null;
}
