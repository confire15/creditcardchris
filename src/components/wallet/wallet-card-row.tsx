"use client";

import { Reorder, useDragControls, motion } from "motion/react";
import { UserCard, SpendingCategory, StatementCredit } from "@/lib/types/database";
import { CreditCardVisual } from "./credit-card-visual";
import { Chip } from "./_shared/Chip";
import { GripVertical } from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";

type Variant = "grid" | "rearrange";

export interface WalletCardRowProps {
  card: UserCard;
  index: number;
  variant: Variant;
  onOpenDetail: () => void;
  onDragEnd?: () => void;
  categories: SpendingCategory[];
  credits?: StatementCredit[];
}

export function WalletCardRow(props: WalletCardRowProps) {
  if (props.variant === "rearrange") return <RearrangeRow {...props} />;
  return <GridCell {...props} />;
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

/* ─── Grid cell (unified layout for mobile 1-col and desktop 2/3-col) ─────── */
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
            density="grid"
          />
          <div className="mt-2">
            <CreditChips credits={credits} onOpenDetail={onOpenDetail} max={2} />
          </div>
        </div>
      </div>
    </Reorder.Item>
  );
}
