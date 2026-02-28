"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { createClient } from "@/lib/supabase/client";
import { UserCard, Transaction } from "@/lib/types/database";
import { getCardName, getCardColor } from "@/lib/utils/rewards";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import {
  LayoutDashboard,
  CreditCard,
  Receipt,
  Sparkles,
  Target,
  Settings,
  ClipboardList,
  GitCompareArrows,
  Search,
  ArrowRight,
} from "lucide-react";

const PAGES = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/wallet", label: "Wallet", icon: CreditCard },
  { href: "/transactions", label: "Transactions", icon: Receipt },
  { href: "/recommend", label: "Best Card", icon: Sparkles },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/compare", label: "Compare Cards", icon: GitCompareArrows },
  { href: "/applications", label: "Applications", icon: ClipboardList },
  { href: "/settings", label: "Settings", icon: Settings },
];

interface CommandPaletteProps {
  userId: string;
}

export function CommandPalette({ userId }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [cards, setCards] = useState<UserCard[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loaded, setLoaded] = useState(false);
  const router = useRouter();
  const supabase = createClient();
  const inputRef = useRef<HTMLInputElement>(null);

  // Open on Cmd+K / Ctrl+K
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      if (!loaded) fetchData();
    } else {
      setQuery("");
    }
  }, [open]);

  const fetchData = useCallback(async () => {
    const [cardsRes, txRes] = await Promise.all([
      supabase
        .from("user_cards")
        .select("*, card_template:card_templates(*)")
        .eq("user_id", userId)
        .eq("is_active", true)
        .order("sort_order"),
      supabase
        .from("transactions")
        .select("*, user_card:user_cards(*, card_template:card_templates(*)), category:spending_categories(*)")
        .eq("user_id", userId)
        .order("transaction_date", { ascending: false })
        .limit(100),
    ]);
    setCards(cardsRes.data ?? []);
    setTransactions(txRes.data ?? []);
    setLoaded(true);
  }, [userId, supabase]);

  function navigate(href: string) {
    router.push(href);
    setOpen(false);
  }

  const q = query.toLowerCase();

  const filteredPages = PAGES.filter((p) =>
    q === "" || p.label.toLowerCase().includes(q)
  );

  const filteredCards = cards.filter((c) =>
    q !== "" && getCardName(c).toLowerCase().includes(q)
  );

  const filteredTx = transactions.filter((tx) =>
    q !== "" &&
    (tx.merchant?.toLowerCase().includes(q) ||
      tx.category?.display_name?.toLowerCase().includes(q))
  ).slice(0, 5);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center pt-[10vh] px-4"
      onClick={() => setOpen(false)}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className="relative w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <Command shouldFilter={false}>
          {/* Search input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
            <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search pages, cards, transactions..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-border bg-muted/50 px-1.5 text-[10px] font-medium text-muted-foreground">
              ESC
            </kbd>
          </div>

          <Command.List className="max-h-[60vh] overflow-y-auto py-2">
            {/* Pages */}
            {filteredPages.length > 0 && (
              <Command.Group heading={<span className="px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Pages</span>}>
                {filteredPages.map((page) => {
                  const Icon = page.icon;
                  return (
                    <Command.Item
                      key={page.href}
                      onSelect={() => navigate(page.href)}
                      className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-muted/50 data-[selected=true]:bg-muted transition-colors"
                    >
                      <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                      <span className="text-sm">{page.label}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground ml-auto" />
                    </Command.Item>
                  );
                })}
              </Command.Group>
            )}

            {/* Cards */}
            {filteredCards.length > 0 && (
              <Command.Group heading={<span className="px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Cards</span>}>
                {filteredCards.map((card) => (
                  <Command.Item
                    key={card.id}
                    onSelect={() => navigate("/wallet")}
                    className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-muted/50 data-[selected=true]:bg-muted transition-colors"
                  >
                    <div
                      className="w-7 h-4.5 rounded flex-shrink-0"
                      style={{ backgroundColor: getCardColor(card) }}
                    />
                    <span className="text-sm">{getCardName(card)}</span>
                    {card.last_four && (
                      <span className="text-xs text-muted-foreground ml-auto">··{card.last_four}</span>
                    )}
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Transactions */}
            {filteredTx.length > 0 && (
              <Command.Group heading={<span className="px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Transactions</span>}>
                {filteredTx.map((tx) => (
                  <Command.Item
                    key={tx.id}
                    onSelect={() => navigate("/transactions")}
                    className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-muted/50 data-[selected=true]:bg-muted transition-colors"
                  >
                    <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                      {tx.user_card ? (
                        <div
                          className="w-3 h-2 rounded-sm"
                          style={{ backgroundColor: getCardColor(tx.user_card) }}
                        />
                      ) : (
                        <Receipt className="w-3.5 h-3.5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{tx.merchant ?? tx.category?.display_name ?? "Transaction"}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(tx.transaction_date)}</p>
                    </div>
                    <span className="text-sm font-medium flex-shrink-0">{formatCurrency(tx.amount)}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {q !== "" && filteredPages.length === 0 && filteredCards.length === 0 && filteredTx.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                No results for &ldquo;{query}&rdquo;
              </div>
            )}
          </Command.List>

          {/* Footer hint */}
          <div className="px-4 py-2.5 border-t border-border flex items-center gap-4 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-border bg-muted/50 px-1 py-0.5">↑↓</kbd> navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-border bg-muted/50 px-1 py-0.5">↵</kbd> select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-border bg-muted/50 px-1 py-0.5">esc</kbd> close
            </span>
          </div>
        </Command>
      </div>
    </div>
  );
}
