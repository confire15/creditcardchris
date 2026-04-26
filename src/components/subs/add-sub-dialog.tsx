"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

export function AddSubDialog({
  open,
  onOpenChange,
  userCardId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userCardId: string;
  onSaved: () => void;
}) {
  const [rewardAmount, setRewardAmount] = useState("");
  const [rewardUnit, setRewardUnit] = useState("points");
  const [requiredSpend, setRequiredSpend] = useState("");
  const [deadline, setDeadline] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/subs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userCardId,
          rewardAmount: Number(rewardAmount),
          rewardUnit,
          requiredSpend: Number(requiredSpend),
          deadline,
          notes,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error ?? "Failed to save SUB");
        return;
      }
      toast.success("SUB saved");
      onOpenChange(false);
      onSaved();
    } catch {
      toast.error("Failed to save SUB");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Sign-up Bonus</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Reward amount</Label>
              <Input type="number" min="1" value={rewardAmount} onChange={(e) => setRewardAmount(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Reward unit</Label>
              <Input value={rewardUnit} onChange={(e) => setRewardUnit(e.target.value)} placeholder="points, miles..." />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Required spend ($)</Label>
            <Input type="number" min="1" value={requiredSpend} onChange={(e) => setRequiredSpend(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Deadline</Label>
            <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Notes (optional)</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <Button className="w-full" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save SUB"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
