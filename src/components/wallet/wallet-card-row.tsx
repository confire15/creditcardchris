"use client";

import { Reorder, useDragControls, motion } from "motion/react";
import { UserCard, SpendingCategory, StatementCredit } from "@/lib/types/database";
import { CreditCardVisual } from "./credit-card-visual";
import { GripVertical } from "lucide-react";

type Variant = "grid" | "rearrange";

export interface WalletCardRowProps {
  card: UserCard;
  index: number;
  variant: Variant;
  onOpenDetail: () => void;
  onDragEnd?: () => void;
  categories: SpendingCategory[];
  credits?: StatementCredit[];
  ownerLabel?: string | null;
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
  ownerLabel,
}: WalletCardRowProps) {
  return (
    <motion.div
      layout
      className="group/grid"
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 380, damping: 28 }}
    >
      <div className="relative transition-shadow duration-300 rounded-2xl group-hover/grid:[&_.card-surface]:shadow-[var(--card-shadow-hover-ambient),var(--card-shadow-hover-close),var(--card-inner-highlight)]">
        {ownerLabel && (
          <span className="absolute top-2 right-2 z-10 rounded-full bg-background/90 border border-overlay-subtle px-2 py-0.5 text-[10px] font-semibold">
            {ownerLabel}
          </span>
        )}
        <CreditCardVisual
          card={card}
          onClick={onOpenDetail}
          index={index}
          density="grid"
          className="card-surface"
        />
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
