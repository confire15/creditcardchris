"use client";

import { useMemo } from "react";
import { Transaction, UserCard } from "@/lib/types/database";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { format, parseISO, startOfMonth, subMonths, endOfMonth, isWithinInterval } from "date-fns";
import { formatCurrency } from "@/lib/utils/format";
import { getCardName, getCardColor } from "@/lib/utils/rewards";
import { CATEGORY_COLORS } from "@/lib/constants/categories";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name?: string }>; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl px-3 py-2 text-sm shadow-lg">
      <p className="text-muted-foreground mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="font-semibold">{formatCurrency(p.value)}</p>
      ))}
    </div>
  );
};

export function InsightsContent({ transactions, cards }: { transactions: Transaction[]; cards: UserCard[] }) {
  const now = new Date();

  // Monthly totals for last 6 months
  const monthlyData = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const monthStart = startOfMonth(subMonths(now, 5 - i));
      const monthEnd = endOfMonth(monthStart);
      const label = format(monthStart, "MMM");
      const spent = transactions
        .filter((t) => isWithinInterval(parseISO(t.transaction_date), { start: monthStart, end: monthEnd }))
        .reduce((s, t) => s + t.amount, 0);
      const rewards = transactions
        .filter((t) => isWithinInterval(parseISO(t.transaction_date), { start: monthStart, end: monthEnd }))
        .reduce((s, t) => s + (t.rewards_earned ?? 0), 0);
      return { label, spent, rewards };
    });
  }, [transactions]);

  // This month vs last month
  const thisMonthStart = startOfMonth(now);
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const thisMonthEnd = endOfMonth(now);
  const lastMonthEnd = endOfMonth(lastMonthStart);

  const thisMonthSpend = transactions
    .filter((t) => isWithinInterval(parseISO(t.transaction_date), { start: thisMonthStart, end: thisMonthEnd }))
    .reduce((s, t) => s + t.amount, 0);
  const lastMonthSpend = transactions
    .filter((t) => isWithinInterval(parseISO(t.transaction_date), { start: lastMonthStart, end: lastMonthEnd }))
    .reduce((s, t) => s + t.amount, 0);
  const momChange = lastMonthSpend > 0 ? ((thisMonthSpend - lastMonthSpend) / lastMonthSpend) * 100 : 0;

  // This month rewards
  const thisMonthRewards = transactions
    .filter((t) => isWithinInterval(parseISO(t.transaction_date), { start: thisMonthStart, end: thisMonthEnd }))
    .reduce((s, t) => s + (t.rewards_earned ?? 0), 0);
  const lastMonthRewards = transactions
    .filter((t) => isWithinInterval(parseISO(t.transaction_date), { start: lastMonthStart, end: lastMonthEnd }))
    .reduce((s, t) => s + (t.rewards_earned ?? 0), 0);

  // Category breakdown (last 30 days)
  const thirtyDaysAgo = subMonths(now, 1);
  const recentTx = transactions.filter((t) => parseISO(t.transaction_date) >= thirtyDaysAgo);
  const categoryData = useMemo(() => {
    const map: Record<string, { name: string; amount: number; catName: string }> = {};
    for (const t of recentTx) {
      if (!t.category) continue;
      const key = t.category.name;
      if (!map[key]) map[key] = { name: t.category.display_name, amount: 0, catName: key };
      map[key].amount += t.amount;
    }
    return Object.values(map).sort((a, b) => b.amount - a.amount).slice(0, 8);
  }, [recentTx]);

  // Top merchants (last 30 days)
  const merchantData = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of recentTx) {
      const name = t.merchant || t.description || "Unknown";
      map[name] = (map[name] || 0) + t.amount;
    }
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, amount]) => ({ name, amount }));
  }, [recentTx]);

  // Spending by card (last 30 days)
  const cardData = useMemo(() => {
    const map: Record<string, { name: string; amount: number; color: string }> = {};
    for (const t of recentTx) {
      if (!t.user_card_id) continue;
      const card = cards.find((c) => c.id === t.user_card_id);
      if (!card) continue;
      if (!map[t.user_card_id]) {
        map[t.user_card_id] = {
          name: getCardName(card),
          amount: 0,
          color: getCardColor(card),
        };
      }
      map[t.user_card_id].amount += t.amount;
    }
    return Object.values(map).sort((a, b) => b.amount - a.amount);
  }, [recentTx, cards]);

  const totalRewards = transactions.reduce((s, t) => s + (t.rewards_earned ?? 0), 0);

  return (
    <div>
      <div className="mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Insights</h1>
        <p className="text-muted-foreground text-base mt-2">
          Spending trends and rewards analysis
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="This Month"
          value={formatCurrency(thisMonthSpend)}
          sub={
            <span className={cn("flex items-center gap-1 text-xs",
              momChange > 5 ? "text-red-400" : momChange < -5 ? "text-emerald-400" : "text-muted-foreground"
            )}>
              {momChange > 5 ? <TrendingUp className="w-3 h-3" /> : momChange < -5 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
              {momChange > 0 ? "+" : ""}{momChange.toFixed(1)}% vs last month
            </span>
          }
        />
        <StatCard
          label="Last Month"
          value={formatCurrency(lastMonthSpend)}
          sub={<span className="text-xs text-muted-foreground">{format(lastMonthStart, "MMMM")}</span>}
        />
        <StatCard
          label="Monthly Rewards"
          value={thisMonthRewards.toLocaleString(undefined, { maximumFractionDigits: 0 }) + " pts"}
          sub={
            <span className="text-xs text-muted-foreground">
              {lastMonthRewards > 0 ? `${lastMonthRewards.toLocaleString(undefined, { maximumFractionDigits: 0 })} last month` : "No data"}
            </span>
          }
        />
        <StatCard
          label="Total Rewards"
          value={totalRewards.toLocaleString(undefined, { maximumFractionDigits: 0 }) + " pts"}
          sub={<span className="text-xs text-muted-foreground">all time</span>}
        />
      </div>

      {/* Monthly spending trend */}
      <div className="bg-card border border-border rounded-2xl p-6 mb-6">
        <h2 className="text-base font-semibold mb-5">Monthly Spending</h2>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={monthlyData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="label" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} width={40} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="spent" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#spendGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Two columns: categories + merchants */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Category breakdown */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <h2 className="text-base font-semibold mb-5">Spending by Category <span className="text-xs text-muted-foreground font-normal">(last 30 days)</span></h2>
          {categoryData.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={categoryData} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={90} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="amount" radius={[0, 6, 6, 0]}>
                  {categoryData.map((d, i) => (
                    <Cell key={i} fill={CATEGORY_COLORS[d.catName as keyof typeof CATEGORY_COLORS] ?? "hsl(var(--primary))"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top merchants */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <h2 className="text-base font-semibold mb-5">Top Merchants <span className="text-xs text-muted-foreground font-normal">(last 30 days)</span></h2>
          {merchantData.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No data yet</p>
          ) : (
            <div className="space-y-3">
              {merchantData.map((m, i) => {
                const max = merchantData[0].amount;
                return (
                  <div key={m.name} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-4 text-right flex-shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium truncate">{m.name}</span>
                        <span className="text-sm font-semibold flex-shrink-0 ml-2">{formatCurrency(m.amount)}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary/60"
                          style={{ width: `${(m.amount / max) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Rewards trend */}
      <div className="bg-card border border-border rounded-2xl p-6 mb-6">
        <h2 className="text-base font-semibold mb-5">Monthly Rewards Earned</h2>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={monthlyData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <XAxis dataKey="label" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => v.toLocaleString()} width={50} />
            <Tooltip content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              return (
                <div className="bg-card border border-border rounded-xl px-3 py-2 text-sm shadow-lg">
                  <p className="text-muted-foreground mb-1">{label}</p>
                  <p className="font-semibold">{(payload[0].value as number).toLocaleString(undefined, { maximumFractionDigits: 0 })} pts</p>
                </div>
              );
            }} />
            <Bar dataKey="rewards" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} opacity={0.8} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Spending by card */}
      {cardData.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-6">
          <h2 className="text-base font-semibold mb-5">Spending by Card <span className="text-xs text-muted-foreground font-normal">(last 30 days)</span></h2>
          <div className="space-y-3">
            {cardData.map((c) => {
              const total = cardData.reduce((s, x) => s + x.amount, 0);
              return (
                <div key={c.name} className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium truncate">{c.name}</span>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                        <span className="text-xs text-muted-foreground">{((c.amount / total) * 100).toFixed(0)}%</span>
                        <span className="text-sm font-semibold">{formatCurrency(c.amount)}</span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${(c.amount / total) * 100}%`, backgroundColor: c.color }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-2xl font-bold tracking-tight">{value}</p>
      {sub && <div className="mt-1">{sub}</div>}
    </div>
  );
}
