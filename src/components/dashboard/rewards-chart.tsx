"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Transaction } from "@/lib/types/database";
import { getCardName, getCardColor } from "@/lib/utils/rewards";

export function RewardsChart({ transactions }: { transactions: Transaction[] }) {
  // Aggregate rewards by card
  const byCard: Record<string, { name: string; rewards: number; color: string }> = {};

  for (const tx of transactions) {
    if (!tx.user_card || !tx.rewards_earned) continue;
    const key = tx.user_card.id;
    if (!byCard[key]) {
      byCard[key] = {
        name: getCardName(tx.user_card),
        rewards: 0,
        color: getCardColor(tx.user_card),
      };
    }
    byCard[key].rewards += tx.rewards_earned;
  }

  const data = Object.values(byCard)
    .sort((a, b) => b.rewards - a.rewards)
    .slice(0, 6);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
        No rewards data yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ left: 0, right: 16, top: 0, bottom: 0 }}>
        <XAxis
          dataKey="name"
          tick={{ fontSize: 12, fill: "oklch(0.6 0.02 255)" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: string) => (v.length > 12 ? v.slice(0, 12) + "…" : v)}
        />
        <YAxis
          tick={{ fontSize: 12, fill: "oklch(0.6 0.02 255)" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => v.toLocaleString()}
        />
        <Tooltip
          formatter={(value) => [
            Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 }),
            "Rewards",
          ]}
          contentStyle={{
            fontSize: 13,
            borderRadius: 12,
            backgroundColor: "oklch(0.16 0.04 255)",
            border: "1px solid oklch(0.24 0.035 255)",
            color: "#fff",
          }}
        />
        <Bar dataKey="rewards" radius={[6, 6, 0, 0]}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
