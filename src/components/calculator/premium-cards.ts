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
];

export function getCardById(id: string | null): PremiumCard | null {
  if (!id) return null;
  return PREMIUM_CARDS.find((c) => c.id === id) ?? null;
}
