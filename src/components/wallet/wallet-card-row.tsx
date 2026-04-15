"use client";

import { Reorder, useDragControls, AnimatePresence, motion } from "motion/react";
import { UserCard, SpendingCategory, StatementCredit } from "@/lib/types/database";
import { CreditCardVisual } from "./credit-card-visual";
import { CardQuickActions } from "./card-quick-actions";
import { Chip } from "./_shared/Chip";
import { GripVertical, ChevronDown } from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";

export function WalletCardRow({
  card,
  index,
  isExpanded,
  onExpand,
  onOpenDetail,
  onArchive,
  onCardUpdated,
  onDragEnd,
  categories,
  credits = [],
}: {
  card: UserCard;
  index: number;
  isExpanded: boolean;
  onExpand: () => void;
  onOpenDetail: () => void;
  onArchive: () => void;
  onCardUpdated: () => void;
  onDragEnd: () => void;
  categories: SpendingCategory[];
  credits?: StatementCredit[];
}) {
  const controls = useDragControls();

  // Build credit chips: show up to 3, sorted by remaining value descending
  const creditChips = credits
    .filter((c) => c.annual_amount > 0)
    .sort((a, b) => (b.annual_amount - b.used_amount) - (a.annual_amount - a.used_amount))
    .slice(0, 3);

  const extraCredits = credits.length - creditChips.length;

  return (
    <Reorder.Item
      value={card}
      dragListener={false}
      dragControls={controls}
      onDragEnd={onDragEnd}
      className="list-none"
      whileDrag={{
        scale: 1.02,
        boxShadow: "var(--card-lift-shadow)",
        zIndex: 50,
      }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      layout
    >
      <div className="flex items-start gap-3 group/row">
        {/* Drag handle — visible on mobile, hover-reveal on desktop */}
        <button
          className="mt-4 flex-shrink-0 h-8 w-6 flex items-center justify-center rounded-lg
            text-muted-foreground/40 hover:text-muted-foreground/80 cursor-grab active:cursor-grabbing
            touch-none transition-colors
            sm:opacity-0 sm:group-hover/row:opacity-100"
          onPointerDown={(e) => controls.start(e)}
          title="Drag to reorder"
          type="button"
          aria-label="Drag to reorder"
        >
          <GripVertical className="w-4 h-4" />
        </button>

        {/* Card + meta row + expandable panel */}
        <div className="flex-1 min-w-0">
          {/* Card visual */}
          <CreditCardVisual card={card} onClick={onExpand} index={index} />

          {/* Meta row: chips (always visible) + chevron toggle */}
          <div className="mt-2 flex items-center gap-1.5 min-w-0">
            {/* Credit chips — scrollable on mobile, wrap on desktop */}
            <div className="flex-1 flex items-center gap-1.5 overflow-x-auto scrollbar-none min-w-0">
              {creditChips.map((credit) => {
                const remaining = Math.max(0, credit.annual_amount - credit.used_amount);
                const pct = Math.min((credit.used_amount / credit.annual_amount) * 100, 100);
                const label = `${credit.name} · ${formatCurrency(remaining)} left`;
                return (
                  <Chip
                    key={credit.id}
                    variant="credit"
                    label={label}
                    progress={pct}
                    onClick={onOpenDetail}
                    className="flex-shrink-0"
                  />
                );
              })}
              {extraCredits > 0 && (
                <Chip
                  variant="base"
                  label={`+${extraCredits} more`}
                  onClick={onOpenDetail}
                  className="flex-shrink-0"
                />
              )}
            </div>

            {/* Chevron expand toggle */}
            <motion.button
              type="button"
              onClick={onExpand}
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="flex-shrink-0 h-7 w-7 flex items-center justify-center rounded-full
                text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted/40 transition-colors"
              aria-label={isExpanded ? "Collapse" : "Expand quick actions"}
            >
              <ChevronDown className="w-4 h-4" />
            </motion.button>
          </div>

          {/* Expandable quick-actions panel */}
          <AnimatePresence initial={false}>
            {isExpanded && (
              <motion.div
                key="quick-actions"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
                className="overflow-hidden"
              >
                <CardQuickActions
                  card={card}
                  categories={categories}
                  onOpenDetail={onOpenDetail}
                  onArchive={onArchive}
                  onCardUpdated={onCardUpdated}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </Reorder.Item>
  );
}
