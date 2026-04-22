"use client";

import { UserCard } from "@/lib/types/database";
import { getCardName } from "@/lib/utils/rewards";
import { CreditCardVisual } from "./credit-card-visual";
import { Archive, ChevronDown, RotateCcw, Trash2, Check, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";

export function ArchivedDrawer({
  cards,
  open,
  onToggle,
  onRestore,
  onDelete,
  onRestoreMany,
  onDeleteMany,
}: {
  cards: UserCard[];
  open: boolean;
  onToggle: () => void;
  onRestore: (card: UserCard) => void;
  onDelete: (card: UserCard) => void;
  onRestoreMany?: (cards: UserCard[]) => void;
  onDeleteMany?: (cards: UserCard[]) => void;
}) {
  const [cleanupMode, setCleanupMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const selectedCards = useMemo(
    () => cards.filter((c) => selectedIds.has(c.id)),
    [cards, selectedIds]
  );

  function toggleSelected(cardId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) next.delete(cardId);
      else next.add(cardId);
      return next;
    });
  }

  function closeCleanupMode() {
    setCleanupMode(false);
    setSelectedIds(new Set());
  }

  if (cards.length === 0) return null;

  return (
    <div className="mt-10 pt-8 border-t border-overlay-subtle">
      <div className="mb-4 flex items-center gap-2">
        <button
          onClick={onToggle}
          className="group flex min-w-0 flex-1 items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <Archive className="w-4 h-4" />
          <span>Archived</span>
          <span className="text-xs bg-muted px-1.5 py-0.5 rounded-md font-medium">{cards.length}</span>
          <ChevronDown
            className={cn(
              "w-4 h-4 transition-transform duration-200 ml-auto",
              open && "rotate-180"
            )}
          />
        </button>
        {open && (
          <button
            onClick={() => {
              if (cleanupMode) closeCleanupMode();
              else setCleanupMode(true);
            }}
            className={cn(
              "text-xs px-2 py-1 rounded-md border transition-colors",
              cleanupMode
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            {cleanupMode ? "Done" : "Cleanup"}
          </button>
        )}
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="overflow-hidden"
          >
            {cleanupMode && (
              <div className="mb-3 rounded-xl border border-border/60 bg-card px-3 py-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs text-muted-foreground">{selectedIds.size} selected</p>
                  <button
                    onClick={() => {
                      if (selectedCards.length > 0) onRestoreMany?.(selectedCards);
                      closeCleanupMode();
                    }}
                    disabled={selectedCards.length === 0}
                    className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Restore Selected
                  </button>
                  <button
                    onClick={() => {
                      if (selectedCards.length > 0) onDeleteMany?.(selectedCards);
                      closeCleanupMode();
                    }}
                    disabled={selectedCards.length === 0}
                    className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md border border-border text-xs text-destructive hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="w-3 h-3" />
                    Delete Selected
                  </button>
                  <button
                    onClick={closeCleanupMode}
                    className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 ml-auto"
                  >
                    <X className="w-3 h-3" />
                    Cancel
                  </button>
                </div>
              </div>
            )}
            <div className="space-y-4">
              {cards.map((card) => (
                <motion.div
                  key={card.id}
                  className="relative group"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="opacity-40 pointer-events-none select-none">
                    <CreditCardVisual card={card} />
                  </div>
                  {cleanupMode ? (
                    <button
                      onClick={() => toggleSelected(card.id)}
                      className={cn(
                        "absolute right-2 top-2 z-10 inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold shadow-sm",
                        selectedIds.has(card.id)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background/90 text-muted-foreground border-border"
                      )}
                    >
                      {selectedIds.has(card.id) && <Check className="w-3 h-3" />}
                      {selectedIds.has(card.id) ? "Selected" : "Select"}
                    </button>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity rounded-2xl bg-background/70 backdrop-blur-sm">
                      <button
                        onClick={() => onRestore(card)}
                        className="flex items-center gap-1.5 h-10 px-4 bg-card border border-border rounded-xl text-sm font-medium hover:bg-muted transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Restore
                      </button>
                      <button
                        onClick={() => onDelete(card)}
                        className="flex items-center gap-1.5 h-10 px-4 bg-card border border-border rounded-xl text-sm font-medium text-destructive hover:bg-muted transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    </div>
                  )}
                  <p className="text-xs text-center text-muted-foreground mt-1.5">{getCardName(card)}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
