"use client";

import { Reorder, useDragControls, AnimatePresence, motion } from "motion/react";
import { UserCard, SpendingCategory, StatementCredit } from "@/lib/types/database";
import { CreditCardVisual } from "./credit-card-visual";
import { CardQuickActions } from "./card-quick-actions";
import { Chip } from "./_shared/Chip";
import { GripVertical, ChevronDown } from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

type Variant = "stack" | "grid" | "rearrange";

export interface WalletCardRowProps {
  card: UserCard;
  index: number;
  variant: Variant;
  isExpanded: boolean;
  anyExpanded?: boolean;
  onExpand: () => void;
  onOpenDetail: () => void;
  onArchive: () => void;
  onCardUpdated: () => void;
  onDragEnd?: () => void;
  categories: SpendingCategory[];
  credits?: StatementCredit[];
}

export function WalletCardRow(props: WalletCardRowProps) {
  if (props.variant === "rearrange") return <RearrangeRow {...props} />;
  if (props.variant === "grid") return <GridCell {...props} />;
  return <StackRow {...props} />;
}

/* ─── Credit chips shared ─────────────────────────────────────────────────── */
function CreditChips({
  credits,
  onOpenDetail,
  max = 3,
}: {
  credits: StatementCredit[];
  onOpenDetail: () => void;
  max?: number;
}) {
  const creditChips = credits
    .filter((c) => c.annual_amount > 0)
    .sort(
      (a, b) => b.annual_amount - b.used_amount - (a.annual_amount - a.used_amount)
    )
    .slice(0, max);
  const extra = credits.length - creditChips.length;
  if (creditChips.length === 0 && extra <= 0) return null;

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none min-w-0">
      {creditChips.map((credit) => {
        const remaining = Math.max(0, credit.annual_amount - credit.used_amount);
        const pct = Math.min((credit.used_amount / credit.annual_amount) * 100, 100);
        return (
          <Chip
            key={credit.id}
            variant="credit"
            label={`${credit.name} · ${formatCurrency(remaining)} left`}
            progress={pct}
            onClick={onOpenDetail}
            className="flex-shrink-0"
          />
        );
      })}
      {extra > 0 && (
        <Chip
          variant="base"
          label={`+${extra} more`}
          onClick={onOpenDetail}
          className="flex-shrink-0"
        />
      )}
    </div>
  );
}

/* ─── Mobile overlap stack ────────────────────────────────────────────────── */
function StackRow({
  card,
  index,
  isExpanded,
  anyExpanded,
  onExpand,
  onOpenDetail,
  onArchive,
  onCardUpdated,
  categories,
  credits = [],
}: WalletCardRowProps) {
  const isFirst = index === 0;
  // Overlap when no card is expanded anywhere. When any card is open, deck
  // spreads apart with normal gap for clarity.
  const overlap = !isFirst && !anyExpanded;

  // margin-top expressed as inline style to avoid Tailwind v4 arbitrary-value
  // parsing issues with division inside calc().
  // 63.1% ≈ 100% / 1.586 — percentage margin is relative to containing block
  // width, which equals the card's own width, so this equals the card height.
  // Result: pull the card up by (cardHeight - peek), leaving only peek visible.
  const marginTop = overlap
    ? "calc(var(--card-peek) - 63.1%)"
    : isFirst
    ? undefined
    : "var(--card-stack-expanded-gap)";

  return (
    <motion.div
      layout
      transition={{ type: "spring", stiffness: 320, damping: 32 }}
      className="relative"
      style={{
        marginTop,
        // zIndex: keep all non-expanded cards positive; expanded card on top.
        // Use 100-index so card 0 = 100, card 16 = 84 — never goes negative
        // regardless of wallet size.
        zIndex: isExpanded ? 200 : 100 - index,
      }}
    >
      <CreditCardVisual
        card={card}
        onClick={onExpand}
        index={index}
        density="stack"
      />

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            key="expanded"
            layout
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className="overflow-hidden"
          >
            <div className="mt-2 flex items-center gap-1.5 min-w-0">
              <div className="flex-1 min-w-0">
                <CreditChips credits={credits} onOpenDetail={onOpenDetail} />
              </div>
              <motion.button
                type="button"
                onClick={onExpand}
                animate={{ rotate: 180 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="flex-shrink-0 h-7 w-7 flex items-center justify-center rounded-full text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/40 transition-colors"
                aria-label="Collapse"
              >
                <ChevronDown className="w-4 h-4" />
              </motion.button>
            </div>

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
    </motion.div>
  );
}

/* ─── Desktop grid cell ───────────────────────────────────────────────────── */
function GridCell({
  card,
  index,
  onOpenDetail,
  credits = [],
}: WalletCardRowProps) {
  return (
    <motion.div
      layout
      className="group/grid"
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 380, damping: 28 }}
    >
      <div className="relative transition-shadow duration-300 rounded-2xl group-hover/grid:[&_.card-surface]:shadow-[var(--card-shadow-hover-ambient),var(--card-shadow-hover-close),var(--card-inner-highlight)]">
        <CreditCardVisual
          card={card}
          onClick={onOpenDetail}
          index={index}
          density="grid"
          className="card-surface"
        />
      </div>
      <div className="mt-2.5 px-1">
        <CreditChips credits={credits} onOpenDetail={onOpenDetail} max={2} />
      </div>
    </motion.div>
  );
}

/* ─── Rearrange (drag-to-reorder) ─────────────────────────────────────────── */
function RearrangeRow({
  card,
  index,
  onOpenDetail,
  onDragEnd,
  credits = [],
}: WalletCardRowProps) {
  const controls = useDragControls();

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
      <div className="flex items-start gap-3">
        <button
          className="mt-5 flex-shrink-0 h-8 w-6 flex items-center justify-center rounded-lg text-muted-foreground/60 hover:text-muted-foreground cursor-grab active:cursor-grabbing touch-none transition-colors"
          onPointerDown={(e) => controls.start(e)}
          title="Drag to reorder"
          type="button"
          aria-label="Drag to reorder"
        >
          <GripVertical className="w-4 h-4" />
        </button>

        <div className="flex-1 min-w-0">
          <CreditCardVisual
            card={card}
            onClick={onOpenDetail}
            index={index}
            density="stack"
          />
          <div className="mt-2">
            <CreditChips credits={credits} onOpenDetail={onOpenDetail} max={2} />
          </div>
        </div>
      </div>
    </Reorder.Item>
  );
}
