"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check } from "lucide-react";

interface SaveConfirmProps {
  /** Increment this number to trigger the confirm flash. */
  trigger: number;
}

/**
 * An inline animated checkmark that springs in then fades after a save.
 * Pass an incrementing `trigger` prop to activate it.
 */
export function SaveConfirm({ trigger }: SaveConfirmProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (trigger === 0) return;
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 1400);
    return () => clearTimeout(t);
  }, [trigger]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.span
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ opacity: 0, scale: 0.7 }}
          transition={{ type: "spring", stiffness: 500, damping: 22 }}
          className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-500/15 text-green-500 flex-shrink-0"
        >
          <Check className="w-3 h-3" strokeWidth={3} />
        </motion.span>
      )}
    </AnimatePresence>
  );
}
