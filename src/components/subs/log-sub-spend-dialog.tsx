"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function LogSubSpendDialog({
  open,
  onOpenChange,
  subId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subId: string;
  onSaved: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/subs/log-spend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subId, amount: Number(amount) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error ?? "Failed to log spend");
        return;
      }
      toast.success("Spend logged");
      onOpenChange(false);
      onSaved();
    } catch {
      toast.error("Failed to log spend");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log SUB Spend</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Amount ($)</Label>
            <Input type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <Button className="w-full" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Log spend"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
