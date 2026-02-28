"use client";

import Link from "next/link";
import { Transaction, UserCard } from "@/lib/types/database";
import { getCardName, getCardColor } from "@/lib/utils/rewards";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { SpendingChart } from "./spending-chart";
import { RewardsChart } from "./rewards-chart";
import { MonthlyChart } from "./monthly-chart";
import { BudgetAlertsWidget } from "./budget-alerts-widget";
import { Badge } from "@/components/ui/badge";
import {
  CreditCard,
  Receipt,
  Sparkles,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Plus,
  Store,
  DollarSign,
} from "lucide-react";

export function DashboardContent({
  transactions,
  cards,
  userId,
}: {
  transactions: Transaction[];
  cards: UserCard[];
  userId: string;
}) {
  const totalSpent = transactions.reduce((sum, t) => sum + t.amount, 0);
  const totalRewards = transactions.reduce(
    (sum, t) => sum + (t.rewards_earned ?? 0),
    0
  );

  // This month's data
  const thisMonth = new Date().toISOString().slice(0, 7);
  const thisMonthTx = transactions.filter((t) =>
    t.transaction_date.startsWith(thisMonth)
  );
  const thisMonthSpent = thisMonthTx.reduce((sum, t) => sum + t.amount, 0);
  const thisMonthRewards = thisMonthTx.reduce(
    (sum, t) => sum + (t.rewards_earned ?? 0),
    0
  );

  const recentTx = transactions.slice(0, 6);

  // Last month's data for month-over-month comparison
  const lastMonthDate = new Date();
  lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
  const lastMonth = lastMonthDate.toISOString().slice(0, 7);
  const lastMonthTx = transactions.filter((t) =>
    t.transaction_date.startsWith(lastMonth)
  );
  const lastMonthSpent = lastMonthTx.reduce((sum, t) => sum + t.amount, 0);
  const lastMonthRewards = lastMonthTx.reduce(
    (sum, t) => sum + (t.rewards_earned ?? 0),
    0
  );

  const spendDelta = lastMonthSpent > 0
    ? ((thisMonthSpent - lastMonthSpent) / lastMonthSpent) * 100
    : null;
  const rewardsDelta = lastMonthRewards > 0
    ? ((thisMonthRewards - lastMonthRewards) / lastMonthRewards) * 100
    : null;

  // Estimated dollar value of all-time rewards (at 1.5¢/pt)
  const DEFAULT_CPP = 1.5;
  const totalRewardsValue = (totalRewards * DEFAULT_CPP) / 100;

  // Year-over-year: current year vs last year by month
  const currentYear = new Date().getFullYear();
  const lastYear = currentYear - 1;
  const yoyData = Array.from({ length: 12 }, (_, i) => {
    const month = String(i + 1).padStart(2, "0");
    const cy = transactions
      .filter((t) => t.transaction_date.startsWith(`${currentYear}-${month}`))
      .reduce((s, t) => s + t.amount, 0);
    const ly = transactions
      .filter((t) => t.transaction_date.startsWith(`${lastYear}-${month}`))
      .reduce((s, t) => s + t.amount, 0);
    return { month: new Date(currentYear, i, 1).toLocaleString("default", { month: "short" }), current: cy, last: ly };
  });
  const hasLastYearData = yoyData.some((d) => d.last > 0);

  // Top 5 merchants by spend (all time)
  const merchantMap = new Map<string, number>();
  transactions.forEach((tx) => {
    if (tx.merchant) {
      merchantMap.set(tx.merchant, (merchantMap.get(tx.merchant) ?? 0) + tx.amount);
    }
  });
  const topMerchants = Array.from(merchantMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  if (cards.length === 0) {
    return (
      <div>
        <div className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-base mt-2">Welcome to Credit Card Chris!</p>
        </div>
        <div className="text-center py-20 border border-dashed border-border rounded-2xl">
          <Sparkles className="w-14 h-14 mx-auto text-muted-foreground mb-5" />
          <h3 className="text-xl font-semibold mb-3">Get started</h3>
          <p className="text-muted-foreground text-base mb-8 max-w-sm mx-auto">
            Add your credit cards to start tracking rewards and getting personalized recommendations.
          </p>
          <Link
            href="/wallet"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 shadow-md shadow-primary/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Your First Card
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-base mt-2">
          Your rewards overview
        </p>
      </div>

      {/* Hero stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-12">
        <div className="bg-card border border-border rounded-2xl p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">This Month</p>
          </div>
          <p className="text-3xl sm:text-4xl font-bold tracking-tight">{formatCurrency(thisMonthSpent)}</p>
          <p className="text-xs text-muted-foreground mt-2">Total spent</p>
        </div>
        <div className="bg-primary/[0.08] border border-primary/20 rounded-2xl p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-primary" />
            <p className="text-xs text-primary/80 font-medium uppercase tracking-wide">Rewards</p>
          </div>
          <p className="text-3xl sm:text-4xl font-bold tracking-tight text-primary">
            {thisMonthRewards.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-primary/60 mt-2">Pts this month</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-muted-foreground" />
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">All Time</p>
          </div>
          <p className="text-3xl sm:text-4xl font-bold tracking-tight">
            {totalRewards.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-muted-foreground mt-2">Total rewards</p>
        </div>
        <div className="bg-emerald-500/[0.06] border border-emerald-500/20 rounded-2xl p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            <p className="text-xs text-emerald-400/80 font-medium uppercase tracking-wide">Est. Value</p>
          </div>
          <p className="text-3xl sm:text-4xl font-bold tracking-tight text-emerald-400">
            {formatCurrency(totalRewardsValue)}
          </p>
          <p className="text-xs text-emerald-400/60 mt-2">At {DEFAULT_CPP}¢/pt</p>
        </div>
      </div>

      {transactions.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-2xl">
          <Receipt className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-3">No transactions yet</h3>
          <p className="text-muted-foreground text-base mb-6">
            Log your first transaction to see spending charts and rewards analysis.
          </p>
          <Link
            href="/transactions"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 shadow-md shadow-primary/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Transaction
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Month-over-month insights */}
          {(lastMonthTx.length > 0 || thisMonthTx.length > 0) && (
            <div className="bg-card border border-border rounded-2xl p-8">
              <h2 className="text-lg font-semibold mb-6">Month-over-Month</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Spending comparison */}
                <div>
                  <p className="text-sm text-muted-foreground font-medium mb-3">Spending</p>
                  <div className="flex items-end gap-4">
                    <div>
                      <p className="text-2xl font-bold tracking-tight">{formatCurrency(thisMonthSpent)}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">This month</p>
                    </div>
                    {spendDelta !== null && (
                      <div className={`flex items-center gap-1 mb-1 text-sm font-medium ${spendDelta > 0 ? "text-red-400" : "text-emerald-400"}`}>
                        {spendDelta > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                        {Math.abs(spendDelta).toFixed(0)}%
                      </div>
                    )}
                  </div>
                  {lastMonthTx.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      vs {formatCurrency(lastMonthSpent)} last month
                    </p>
                  )}
                </div>

                {/* Rewards comparison */}
                <div>
                  <p className="text-sm text-muted-foreground font-medium mb-3">Rewards</p>
                  <div className="flex items-end gap-4">
                    <div>
                      <p className="text-2xl font-bold tracking-tight text-primary">
                        {thisMonthRewards.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">This month</p>
                    </div>
                    {rewardsDelta !== null && (
                      <div className={`flex items-center gap-1 mb-1 text-sm font-medium ${rewardsDelta >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {rewardsDelta >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                        {Math.abs(rewardsDelta).toFixed(0)}%
                      </div>
                    )}
                  </div>
                  {lastMonthTx.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      vs {lastMonthRewards.toLocaleString(undefined, { maximumFractionDigits: 0 })} pts last month
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Top merchants */}
          {topMerchants.length > 0 && (
            <div className="bg-card border border-border rounded-2xl p-8">
              <div className="flex items-center gap-2 mb-6">
                <Store className="w-5 h-5 text-muted-foreground" />
                <h2 className="text-lg font-semibold">Top Merchants</h2>
              </div>
              <div className="space-y-3">
                {topMerchants.map(([merchant, amount], i) => {
                  const maxAmount = topMerchants[0][1];
                  const pct = (amount / maxAmount) * 100;
                  return (
                    <div key={merchant} className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground w-4 flex-shrink-0">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium truncate">{merchant}</span>
                          <span className="text-sm font-semibold ml-3 flex-shrink-0">{formatCurrency(amount)}</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary/60 rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Budget alerts */}
          <BudgetAlertsWidget userId={userId} />

          {/* Monthly trend — full width, prominent */}
          <div className="bg-card border border-border rounded-2xl p-8">
            <h2 className="text-lg font-semibold mb-6">Monthly Spending</h2>
            <MonthlyChart transactions={transactions} />
          </div>

          {/* Year-over-Year */}
          {hasLastYearData && (
            <div className="bg-card border border-border rounded-2xl p-8">
              <h2 className="text-lg font-semibold mb-1">Year over Year</h2>
              <p className="text-sm text-muted-foreground mb-6">{currentYear} vs {lastYear}</p>
              <div className="space-y-2">
                {yoyData.map((d) => {
                  const maxVal = Math.max(...yoyData.map((x) => Math.max(x.current, x.last)), 1);
                  return (
                    <div key={d.month} className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-7 flex-shrink-0">{d.month}</span>
                      <div className="flex-1 space-y-1">
                        {d.current > 0 && (
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-muted/50 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary/70 rounded-full transition-all"
                                style={{ width: `${(d.current / maxVal) * 100}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground w-16 text-right flex-shrink-0">{formatCurrency(d.current)}</span>
                          </div>
                        )}
                        {d.last > 0 && (
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-muted/50 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-muted-foreground/30 rounded-full transition-all"
                                style={{ width: `${(d.last / maxVal) * 100}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground/50 w-16 text-right flex-shrink-0">{formatCurrency(d.last)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-2 rounded-full bg-primary/70" />
                  <span className="text-xs text-muted-foreground">{currentYear}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-2 rounded-full bg-muted-foreground/30" />
                  <span className="text-xs text-muted-foreground">{lastYear}</span>
                </div>
              </div>
            </div>
          )}

          {/* Category and Rewards — side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-card border border-border rounded-2xl p-8">
              <h2 className="text-lg font-semibold mb-6">Spending by Category</h2>
              <SpendingChart transactions={transactions} />
            </div>
            <div className="bg-card border border-border rounded-2xl p-8">
              <h2 className="text-lg font-semibold mb-6">Rewards by Card</h2>
              <RewardsChart transactions={transactions} />
            </div>
          </div>

          {/* Recent transactions */}
          <div className="bg-card border border-border rounded-2xl p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">Recent Activity</h2>
              <Link
                href="/transactions"
                className="text-sm text-primary hover:text-primary/80 flex items-center gap-1.5 font-medium transition-colors"
              >
                View all <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="space-y-3">
              {recentTx.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center gap-4 p-4 rounded-xl bg-muted/20 hover:bg-muted/50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    {tx.user_card ? (
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: getCardColor(tx.user_card) }}
                      />
                    ) : (
                      <Receipt className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">
                      {tx.merchant ?? tx.category?.display_name ?? "Transaction"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDate(tx.transaction_date)}
                      {tx.user_card && ` · ${getCardName(tx.user_card)}`}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold">
                      {formatCurrency(tx.amount)}
                    </p>
                    {tx.rewards_earned && (
                      <p className="text-xs text-primary font-medium mt-0.5">
                        +{tx.rewards_earned.toLocaleString(undefined, {
                          maximumFractionDigits: 0,
                        })}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Card quick access */}
          <div className="bg-card border border-border rounded-2xl p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">Your Cards</h2>
              <Link
                href="/wallet"
                className="text-sm text-primary hover:text-primary/80 flex items-center gap-1.5 font-medium transition-colors"
              >
                Manage <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="flex flex-wrap gap-4">
              {cards.map((card) => (
                <div
                  key={card.id}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-muted/20 hover:bg-muted/50 transition-colors"
                >
                  <div
                    className="w-5 h-3.5 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: getCardColor(card) }}
                  />
                  <span className="text-sm font-medium">{getCardName(card)}</span>
                  {card.last_four && (
                    <Badge variant="secondary" className="text-xs">
                      ··{card.last_four}
                    </Badge>
                  )}
                </div>
              ))}
              <Link
                href="/wallet"
                className="flex items-center gap-2 px-4 py-3 rounded-xl border border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary transition-all"
              >
                <CreditCard className="w-4 h-4" />
                <span className="text-sm font-medium">Add card</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
