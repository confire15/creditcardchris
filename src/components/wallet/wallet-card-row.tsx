"use client";

import { Reorder, useDragControls, motion } from "motion/react";
import { UserCard, SpendingCategory, StatementCredit } from "@/lib/types/database";
import { CreditCardVisual } from "./credit-card-visual";
import { Calendar, GripVertical } from "lucide-react";
import { differenceInDays, format, parseISO, startOfDay } from "date-fns";

type Variant = "grid" | "rearrange";

type AnnualFeeCountdown = {
  label: string;
  dateLabel: string;
};

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

/* ─── Grid cell (unified layout for mobile 1-col and desktop 2/3-col) ─────── */
function GridCell({
  card,
  index,
  onOpenDetail,
}: WalletCardRowProps) {
  const annualFeeCountdown = getAnnualFeeCountdown(card);

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
      {annualFeeCountdown && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span
            className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/[0.08] px-2.5 py-1 text-[10px] font-medium text-amber-700 dark:text-amber-300 sm:text-xs"
            title={`Annual fee due ${annualFeeCountdown.dateLabel}`}
          >
            <Calendar className="h-3 w-3" aria-hidden="true" />
            {annualFeeCountdown.label}
          </span>
        </div>
      )}
    </motion.div>
  );
}

function getAnnualFeeAmount(card: UserCard): number {
  return card.custom_annual_fee ?? card.card_template?.annual_fee ?? 0;
}

function getAnnualFeeCountdown(card: UserCard): AnnualFeeCountdown | null {
  if (!card.annual_fee_date) return null;

  const amount = getAnnualFeeAmount(card);
  if (!Number.isFinite(amount) || amount <= 0) return null;

  const feeDate = parseISO(card.annual_fee_date);
  const days = differenceInDays(startOfDay(feeDate), startOfDay(new Date()));

  if (!Number.isFinite(days) || days < 0 || days > 60) return null;

  const formattedAmount = formatFeeAmount(amount);
  const dueText =
    days === 0
      ? "due today"
      : days === 1
        ? "due tomorrow"
        : `in ${days}d`;

  return {
    label: `${formattedAmount} fee ${dueText}`,
    dateLabel: format(feeDate, "MMM d, yyyy"),
  };
}

function formatFeeAmount(amount: number): string {
  const hasCents = !Number.isInteger(amount);

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: hasCents ? 2 : 0,
  }).format(amount);
}

/* ─── Rearrange (drag-to-reorder) ─────────────────────────────────────────── */
function RearrangeRow({
  card,
  index,
  onOpenDetail,
  onDragEnd,
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
        </div>
      </div>
    </Reorder.Item>
  );
}
