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
import { formatCurrency } from "@/lib/utils/format";
import { CATEGORY_COLORS } from "@/lib/constants/categories";

export function SpendingChart({ transactions }: { transactions: Transaction[] }) {
  // Aggregate by category
  const byCategory: Record<string, { name: string; amount: number; catName: string }> = {};
  for (const tx of transactions) {
    if (!tx.category) continue;
    const key = tx.category.name;
    if (!byCategory[key]) {
      byCategory[key] = { name: tx.category.display_name, amount: 0, catName: key };
    }
    byCategory[key].amount += tx.amount;
  }

  const data = Object.values(byCategory)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 8);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
        No spending data yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} layout="vertical" margin={{ left: 0, right: 16, top: 0, bottom: 0 }}>
        <XAxis
          type="number"
          tickFormatter={(v) => `$${v}`}
          tick={{ fontSize: 12, fill: "oklch(0.6 0.02 255)" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={100}
          tick={{ fontSize: 12, fill: "oklch(0.6 0.02 255)" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          formatter={(value) => [formatCurrency(Number(value)), "Spent"]}
          contentStyle={{
            fontSize: 13,
            borderRadius: 12,
            backgroundColor: "oklch(0.16 0.04 255)",
            border: "1px solid oklch(0.24 0.035 255)",
            color: "#fff",
          }}
        />
        <Bar dataKey="amount" radius={[0, 6, 6, 0]}>
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={CATEGORY_COLORS[entry.catName] ?? "#6366f1"}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
