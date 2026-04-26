import { addDays, addMonths, differenceInDays, isAfter, parseISO, subDays, subMonths } from "date-fns";
import { CardApplication, UserCard } from "@/lib/types/database";

export type RuleVerdict =
  | { status: "safe"; reason?: string }
  | { status: "wait"; daysUntil: number; reason: string }
  | { status: "locked"; reason: string };

export type IssuerRule = {
  issuer: string;
  evaluate: (
    apps: CardApplication[],
    userCards: UserCard[],
    target: { is_business: boolean },
  ) => RuleVerdict;
};

function appDate(app: CardApplication) {
  return parseISO(app.applied_on);
}

function waitUntil(date: Date, reason: string): RuleVerdict {
  return { status: "wait", daysUntil: Math.max(differenceInDays(date, new Date()), 0), reason };
}

export const chase_524: IssuerRule = {
  issuer: "Chase",
  evaluate: (apps, _cards, target) => {
    if (target.is_business) return { status: "safe" };
    const windowStart = subMonths(new Date(), 24);
    const recentPersonal = apps
      .filter((app) => !app.is_business_card)
      .filter((app) => isAfter(appDate(app), windowStart))
      .sort((a, b) => appDate(a).getTime() - appDate(b).getTime());
    if (recentPersonal.length < 5) return { status: "safe" };
    const oldest = appDate(recentPersonal[0]);
    return waitUntil(addMonths(oldest, 24), "Wait for 5/24");
  },
};

export const amex_velocity: IssuerRule = {
  issuer: "American Express",
  evaluate: (apps) => {
    const amexApps = apps
      .filter((app) => app.issuer.toLowerCase().includes("american express") || app.issuer.toLowerCase().includes("amex"))
      .sort((a, b) => appDate(b).getTime() - appDate(a).getTime());
    if (amexApps.length === 0) return { status: "safe" };
    const now = new Date();

    const appWithin5 = amexApps.find((app) => isAfter(appDate(app), subDays(now, 5)));
    if (appWithin5) return waitUntil(addDays(appDate(appWithin5), 5), "Wait for Amex 1-in-5");

    const within90 = amexApps.filter((app) => isAfter(appDate(app), subDays(now, 90)));
    if (within90.length >= 2) {
      const secondNewest = within90.sort((a, b) => appDate(b).getTime() - appDate(a).getTime())[1];
      return waitUntil(addDays(appDate(secondNewest), 90), "Wait for Amex 2-in-90");
    }
    return { status: "safe" };
  },
};

export const citi_8_65_95: IssuerRule = {
  issuer: "Citi",
  evaluate: (apps, _cards, target) => {
    const citiApps = apps
      .filter((app) => app.issuer.toLowerCase().includes("citi"))
      .sort((a, b) => appDate(b).getTime() - appDate(a).getTime());
    if (citiApps.length === 0) return { status: "safe" };
    const now = new Date();

    const appWithin8 = citiApps.find((app) => isAfter(appDate(app), subDays(now, 8)));
    if (appWithin8) return waitUntil(addDays(appDate(appWithin8), 8), "Wait for Citi 8-day rule");

    const within65 = citiApps.filter((app) => isAfter(appDate(app), subDays(now, 65)));
    if (within65.length >= 2) {
      const secondNewest = within65.sort((a, b) => appDate(b).getTime() - appDate(a).getTime())[1];
      return waitUntil(addDays(appDate(secondNewest), 65), "Wait for Citi 65-day rule");
    }

    if (!target.is_business) {
      const personalWithin95 = citiApps.filter((app) => !app.is_business_card).find((app) => isAfter(appDate(app), subDays(now, 95)));
      if (personalWithin95) return waitUntil(addDays(appDate(personalWithin95), 95), "Wait for Citi personal 95-day rule");
    }

    return { status: "safe" };
  },
};

export const capone_velocity: IssuerRule = {
  issuer: "Capital One",
  evaluate: (apps, _cards, target) => {
    if (target.is_business) return { status: "safe" };
    const capApps = apps
      .filter((app) => app.issuer.toLowerCase().includes("capital one"))
      .sort((a, b) => appDate(b).getTime() - appDate(a).getTime());
    if (capApps.length === 0) return { status: "safe" };
    return waitUntil(addMonths(appDate(capApps[0]), 6), "Wait for Capital One 1-per-6-months");
  },
};

export const boa_2_3_4: IssuerRule = {
  issuer: "Bank of America",
  evaluate: (apps) => {
    const boaApps = apps.filter((app) => app.issuer.toLowerCase().includes("bank of america"));
    const now = new Date();
    const within2mo = boaApps.filter((app) => isAfter(appDate(app), subMonths(now, 2)));
    if (within2mo.length >= 2) return { status: "wait", daysUntil: 30, reason: "Wait for BoA 2/3/4 (2 in 2 months)" };
    const within12mo = boaApps.filter((app) => isAfter(appDate(app), subMonths(now, 12)));
    if (within12mo.length >= 3) return { status: "wait", daysUntil: 30, reason: "Wait for BoA 2/3/4 (3 in 12 months)" };
    const within24mo = boaApps.filter((app) => isAfter(appDate(app), subMonths(now, 24)));
    if (within24mo.length >= 4) return { status: "wait", daysUntil: 30, reason: "Wait for BoA 2/3/4 (4 in 24 months)" };
    return { status: "safe" };
  },
};

export const ISSUER_RULES = [chase_524, amex_velocity, citi_8_65_95, capone_velocity, boa_2_3_4];

export function evaluateIssuerRule(
  issuer: string,
  apps: CardApplication[],
  userCards: UserCard[],
  target: { is_business: boolean },
): RuleVerdict {
  const rule = ISSUER_RULES.find((entry) => issuer.toLowerCase().includes(entry.issuer.toLowerCase()));
  if (!rule) return { status: "safe" };
  return rule.evaluate(apps, userCards, target);
}
