"use client";

import { useMemo, useState } from "react";
import { SpendingCategory, UserCard } from "@/lib/types/database";
import { rankCardsForCategory, getCardName } from "@/lib/utils/rewards";
import { formatCurrency } from "@/lib/utils/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type LineItem = {
  id: string;
  categoryId: string;
  amount: string;
};

export function OptimizeTool({
  cards,
  categories,
}: {
  cards: UserCard[];
  categories: SpendingCategory[];
}) {
  const [items, setItems] = useState<LineItem[]>([
    { id: crypto.randomUUID(), categoryId: categories[0]?.id ?? "", amount: "" },
  ]);
  const [tripName, setTripName] = useState("");

  const rows = useMemo(() => {
    return items.map((item) => {
      const amount = Number(item.amount || 0);
      const ranked = item.categoryId ? rankCardsForCategory(cards, item.categoryId) : [];
      const top = ranked[0];
      const projectedValue = top ? amount * top.multiplier * 0.01 : 0;
      return { ...item, amount, top, projectedValue };
    });
  }, [items, cards]);

  const totalProjected = rows.reduce((sum, row) => sum + row.projectedValue, 0);
  const cardsUsed = new Set(rows.filter((row) => row.top).map((row) => row.top!.card.id)).size;

  const saveTrip = () => {
    if (!tripName.trim()) return;
    const payload = { name: tripName.trim(), items, savedAt: new Date().toISOString() };
    const current = JSON.parse(localStorage.getItem("optimize-trip-baskets") ?? "[]");
    localStorage.setItem("optimize-trip-baskets", JSON.stringify([payload, ...current].slice(0, 10)));
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-overlay-subtle bg-card p-4 space-y-3">
        {rows.map((row) => (
          <div key={row.id} className="grid grid-cols-1 sm:grid-cols-[1fr_140px_1fr] gap-2">
            <select
              value={row.categoryId}
              onChange={(e) => setItems((prev) => prev.map((item) => (item.id === row.id ? { ...item, categoryId: e.target.value } : item)))}
              className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm"
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.display_name}</option>
              ))}
            </select>
            <Input
              type="number"
              min="0"
              value={row.amount || ""}
              onChange={(e) => setItems((prev) => prev.map((item) => (item.id === row.id ? { ...item, amount: e.target.value } : item)))}
              placeholder="Amount"
            />
            <div className="h-9 rounded-lg border border-overlay-subtle bg-muted/30 px-3 text-sm flex items-center">
              {row.top ? `${getCardName(row.top.card)} · ${formatCurrency(row.projectedValue)}` : "No card"}
            </div>
          </div>
        ))}
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() =>
              setItems((prev) => [...prev, { id: crypto.randomUUID(), categoryId: categories[0]?.id ?? "", amount: "" }])
            }
          >
            Add row
          </Button>
          <Button
            variant="outline"
            onClick={() => setItems((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev))}
          >
            Remove row
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-overlay-subtle bg-card p-4">
        <p className="text-sm text-muted-foreground">
          Total: <span className="font-semibold text-foreground">{formatCurrency(totalProjected)}</span> projected on {cardsUsed} card{cardsUsed === 1 ? "" : "s"}.
        </p>
      </div>

      <div className="rounded-2xl border border-overlay-subtle bg-card p-4 space-y-2">
        <p className="text-sm font-medium">Trip mode</p>
        <Input value={tripName} onChange={(e) => setTripName(e.target.value)} placeholder="Italy 2026" />
        <Button variant="outline" onClick={saveTrip}>Save to local browser</Button>
      </div>
    </div>
  );
}
