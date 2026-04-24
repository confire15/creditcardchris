"use client";

import { UserCard } from "@/lib/types/database";
import { getCardName } from "@/lib/utils/rewards";
import { CreditCardVisual } from "./credit-card-visual";
import { Archive, ChevronDown, RotateCcw, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";

export function ArchivedDrawer({
  cards,
  open,
  onToggle,
  onRestore,
  onDelete,
  onDeleteAll,
}: {
  cards: UserCard[];
  open: boolean;
  onToggle: () => void;
  onRestore: (card: UserCard) => void;
  onDelete: (card: UserCard) => void;
  onDeleteAll: () => void;
}) {
  if (cards.length === 0) return null;

  return (
    <div className="mt-10 pt-8 border-t border-overlay-subtle">
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={onToggle}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group flex-1"
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
        <button
          onClick={onDeleteAll}
          className="h-8 px-2.5 rounded-lg border border-border text-xs font-medium text-destructive hover:bg-muted transition-colors"
        >
          Clear All
        </button>
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
                  {/* Restore/Delete overlay */}
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
