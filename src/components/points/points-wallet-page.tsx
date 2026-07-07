"use client";

import { useEffect, useMemo, useState } from "react";
import { LoyaltyAccount } from "@/lib/types/database";
import { PremiumGate } from "@/components/premium/premium-gate";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency } from "@/lib/utils/format";
import { CalendarClock, Plus, Trash2, WalletCards } from "lucide-react";
import { differenceInDays, format, parseISO } from "date-fns";
import { toast } from "sonner";

export function PointsWalletPage({ isPremium }: { isPremium: boolean }) {
  const [accounts, setAccounts] = useState<LoyaltyAccount[]>([]);
  const [programName, setProgramName] = useState("");
  const [balance, setBalance] = useState("");
  const [cpp, setCpp] = useState("1.2");
  const [expirationDate, setExpirationDate] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadAccounts() {
    if (!isPremium) return;
    setLoading(true);
    const res = await fetch("/api/points/accounts");
    const data = await res.json().catch(() => ({}));
    if (res.ok) setAccounts(data.accounts ?? []);
    setLoading(false);
  }

  useEffect(() => {
    void loadAccounts();
  }, [isPremium]);

  const totalValue = useMemo(
    () => accounts.reduce((sum, account) => sum + account.balance * (account.point_value_cpp / 100), 0),
    [accounts],
  );
  const expiringSoon = accounts.filter(
    (account) => account.expiration_date && differenceInDays(parseISO(account.expiration_date), new Date()) <= 90,
  );

  async function saveAccount() {
    const res = await fetch("/api/points/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        programName,
        balance: Number(balance),
        pointValueCpp: Number(cpp),
        expirationDate: expirationDate || null,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(data.error ?? "Failed to save account");
      return;
    }
    setProgramName("");
    setBalance("");
    setExpirationDate("");
    toast.success("Points account added");
    void loadAccounts();
  }

  async function archiveAccount(id: string) {
    await fetch("/api/points/accounts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    void loadAccounts();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader
        className="mb-0"
        title="Points Wallet"
        description="Manual balances, expiration dates, and rough cash value without account sync."
      />

      <PremiumGate
        isPremium={isPremium}
        label="Unlock the no-password points wallet with Premium"
        preview={<div className="h-40 rounded-2xl border border-border bg-muted/30" />}
      >
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">Estimated value</p>
            <p className="mt-1 text-2xl font-bold text-success">{formatCurrency(totalValue)}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">Programs</p>
            <p className="mt-1 text-2xl font-bold">{accounts.length}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">Expiring soon</p>
            <p className="mt-1 text-2xl font-bold text-warning">{expiringSoon.length}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="grid gap-2 sm:grid-cols-[1.4fr_1fr_.7fr_1fr_auto]">
            <Input value={programName} onChange={(e) => setProgramName(e.target.value)} placeholder="Program" />
            <Input value={balance} onChange={(e) => setBalance(e.target.value)} inputMode="numeric" placeholder="Balance" />
            <Input value={cpp} onChange={(e) => setCpp(e.target.value)} inputMode="decimal" placeholder="CPP" />
            <Input type="date" value={expirationDate} onChange={(e) => setExpirationDate(e.target.value)} />
            <Button onClick={saveAccount} className="gap-1.5">
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          {loading && <div className="h-24 rounded-2xl bg-muted/30 animate-pulse" />}
          {!loading && accounts.length === 0 && (
            <EmptyState
              title="No points tracked yet"
              description="Add a loyalty balance — like 60,000 MR or 25,000 Alaska miles — and Chris watches its value and expiration risk for you."
            />
          )}
          {accounts.map((account) => {
            const days = account.expiration_date ? differenceInDays(parseISO(account.expiration_date), new Date()) : null;
            return (
              <div key={account.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <WalletCards className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{account.program_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {account.balance.toLocaleString()} points · {account.point_value_cpp} cpp · {formatCurrency(account.balance * (account.point_value_cpp / 100))}
                  </p>
                </div>
                {account.expiration_date && (
                  <div className="hidden text-right text-xs text-muted-foreground sm:block">
                    <CalendarClock className="ml-auto mb-1 h-3.5 w-3.5" />
                    {format(parseISO(account.expiration_date), "MMM d, yyyy")}
                    {days != null && days <= 90 && <p className="text-warning">{Math.max(days, 0)}d left</p>}
                  </div>
                )}
                <button onClick={() => archiveAccount(account.id)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      </PremiumGate>
    </div>
  );
}
