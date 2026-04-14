"use client";

import { Reorder, useDragControls, AnimatePresence, motion } from "motion/react";
import { UserCard, SpendingCategory } from "@/lib/types/database";
import { CreditCardVisual } from "./credit-card-visual";
import { CardQuickActions } from "./card-quick-actions";
import { GripVertical } from "lucide-react";

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
}) {
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
        boxShadow: "0 20px 40px -8px rgba(0,0,0,0.35)",
        zIndex: 50,
      }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      layout
    >
      <div className="flex items-start gap-3">
        {/* Drag handle */}
        <button
          className="mt-4 flex-shrink-0 h-8 w-6 flex items-center justify-center rounded-lg text-muted-foreground/30 hover:text-muted-foreground/70 cursor-grab active:cursor-grabbing touch-none transition-colors"
          onPointerDown={(e) => controls.start(e)}
          title="Drag to reorder"
          type="button"
        >
          <GripVertical className="w-4 h-4" />
        </button>

        {/* Card + expandable panel */}
        <div className="flex-1 min-w-0">
          <CreditCardVisual card={card} onClick={onExpand} index={index} />

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
