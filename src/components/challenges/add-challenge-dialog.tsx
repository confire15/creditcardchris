"use client";

import { useState } from "react";
import { UserCard, SpendingCategory } from "@/lib/types/database";
import { getCardName } from "@/lib/utils/rewards";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function AddChallengeDialog({
  open,
  onOpenChange,
  cards,
  categories,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cards: UserCard[];
  categories: SpendingCategory[];
  onSaved: () => void;
}) {
  const [title, setTitle] = useState("");
  const [targetSpend, setTargetSpend] = useState("");
  const [rewardDescription, setRewardDescription] = useState("");
  const [userCardId, setUserCardId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [startsOn, setStartsOn] = useState(new Date().toISOString().slice(0, 10));
  const [endsOn, setEndsOn] = useState(new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/challenges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          targetSpend: Number(targetSpend),
          rewardDescription,
          userCardId: userCardId || null,
          categoryId: categoryId || null,
          startsOn,
          endsOn,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error ?? "Failed to add challenge");
        return;
      }
      toast.success("Challenge added");
      onOpenChange(false);
      onSaved();
    } catch {
      toast.error("Failed to add challenge");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Spend Challenge</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Spend $2,000 on dining" />
          </div>
          <div className="space-y-1.5">
            <Label>Target spend ($)</Label>
            <Input type="number" min="1" value={targetSpend} onChange={(e) => setTargetSpend(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Reward (optional)</Label>
            <Input value={rewardDescription} onChange={(e) => setRewardDescription(e.target.value)} placeholder="Earn 10,000 points" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Card (optional)</Label>
              <select value={userCardId} onChange={(e) => setUserCardId(e.target.value)} className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm">
                <option value="">Any card</option>
                {cards.map((card) => (
                  <option key={card.id} value={card.id}>{getCardName(card)}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Category (optional)</Label>
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm">
                <option value="">Any category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.display_name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Starts on</Label>
              <Input type="date" value={startsOn} onChange={(e) => setStartsOn(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Ends on</Label>
              <Input type="date" value={endsOn} onChange={(e) => setEndsOn(e.target.value)} />
            </div>
          </div>
          <Button className="w-full" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Add challenge"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
