"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Transaction } from "@/lib/types/database";
import { formatCurrency } from "@/lib/utils/format";
import { format, parseISO, startOfMonth } from "date-fns";

export function MonthlyChart({ transactions }: { transactions: Transaction[] }) {
  // Group by month
  const byMonth: Record<string, number> = {};

  for (const tx of transactions) {
    const month = format(startOfMonth(parseISO(tx.transaction_date)), "MMM yyyy");
    byMonth[month] = (byMonth[month] ?? 0) + tx.amount;
  }

  const data = Object.entries(byMonth)
    .map(([month, amount]) => ({ month, amount }))
    .sort((a, b) => {
      const da = new Date(a.month);
      const db = new Date(b.month);
      return da.getTime() - db.getTime();
    });

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
        No spending history yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ left: 0, right: 16, top: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#d4621a" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#d4621a" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="month"
          tick={{ fontSize: 12, fill: "oklch(0.6 0.02 255)" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 12, fill: "oklch(0.6 0.02 255)" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `$${v}`}
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
        <Area
          type="monotone"
          dataKey="amount"
          stroke="#d4621a"
          strokeWidth={2.5}
          fill="url(#colorAmount)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
