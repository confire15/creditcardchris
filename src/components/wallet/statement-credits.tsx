"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { StatementCredit } from "@/lib/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Trash2, DollarSign, Pencil, PenLine, Check, X } from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { statementCreditSchema } from "@/lib/validations/forms";

const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 0 });

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function inferCadenceFromName(name: string): "annual" | "monthly" {
  const n = name.toLowerCase();
  return n.includes("/mo") || n.includes("monthly") || n.includes("per month") ? "monthly" : "annual";
}

export function StatementCredits({
  userCardId,
  userId,
}: {
  userCardId: string;
  userId: string;
}) {
  const [credits, setCredits] = useState<StatementCredit[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");

  // Add dialog state
  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState("");
  const [annualAmount, setAnnualAmount] = useState("");
  const [usedAmount, setUsedAmount] = useState("");
  const [resetMonth, setResetMonth] = useState<number>(new Date().getMonth() + 1);
  const [cadence, setCadence] = useState<"annual" | "monthly">("annual");

  // Edit dialog state
  const [editCredit, setEditCredit] = useState<StatementCredit | null>(null);
  const [editName, setEditName] = useState("");
  const [editAnnualAmount, setEditAnnualAmount] = useState("");
  const [editResetMonth, setEditResetMonth] = useState<number>(new Date().getMonth() + 1);
  const [editCadence, setEditCadence] = useState<"annual" | "monthly">("annual");

  const supabase = createClient();

  const fetchCredits = useCallback(async () => {
    const { data } = await supabase
      .from("statement_credits")
      .select("*")
      .eq("user_card_id", userCardId)
      .order("created_at");
    setCredits(data ?? []);
    setLoading(false);
  }, [userCardId, supabase]);

  useEffect(() => {
    fetchCredits();
  }, [fetchCredits]);

  function closeAddDialog() {
    setAddOpen(false);
    setName("");
    setAnnualAmount("");
    setUsedAmount("");
    setResetMonth(new Date().getMonth() + 1);
    setCadence("annual");
  }

  function openEditDialog(credit: StatementCredit) {
    const detectedCadence = inferCadenceFromName(credit.name);
    // Strip "/mo" suffix for display in edit field
    const displayName = credit.name.replace(/\s*\/mo$/i, "").trim();
    const displayAmount = detectedCadence === "monthly"
      ? String(credit.annual_amount / 12)
      : String(credit.annual_amount);
    setEditCredit(credit);
    setEditName(displayName);
    setEditAnnualAmount(displayAmount);
    setEditResetMonth(credit.reset_month ?? new Date().getMonth() + 1);
    setEditCadence(detectedCadence);
  }

  function closeEditDialog() {
    setEditCredit(null);
    setEditName("");
    setEditAnnualAmount("");
  }

  async function handleAdd() {
    if (!name.trim() || !annualAmount) return;
    setSaving(true);
    try {
      const effectiveName = cadence === "monthly" && !name.toLowerCase().includes("/mo")
        ? `${name.trim()} /mo`
        : name.trim();

      const parsed = statementCreditSchema.safeParse({
        name: effectiveName,
        annual_amount: parseFloat(annualAmount),
        used_amount: usedAmount ? parseFloat(usedAmount) : 0,
      });
      if (!parsed.success) {
        toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
        setSaving(false);
        return;
      }

      const { error } = await supabase.from("statement_credits").insert({
        user_card_id: userCardId,
        user_id: userId,
        reset_month: resetMonth,
        ...parsed.data,
      });
      if (error) throw error;
      toast.success("Credit added");
      closeAddDialog();
      fetchCredits();
    } catch (err) {
      toast.error("Failed to add credit");
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function handleEditSave() {
    if (!editCredit || !editName.trim() || !editAnnualAmount) return;
    setSaving(true);
    try {
      const effectiveName = editCadence === "monthly" && !editName.toLowerCase().includes("/mo")
        ? `${editName.trim()} /mo`
        : editName.trim();

      const rawAmount = parseFloat(editAnnualAmount);
      const annualValue = editCadence === "monthly" ? rawAmount * 12 : rawAmount;

      const parsed = statementCreditSchema.safeParse({
        name: effectiveName,
        annual_amount: annualValue,
        used_amount: editCredit.used_amount,
      });
      if (!parsed.success) {
        toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
        setSaving(false);
        return;
      }

      const { error } = await supabase
        .from("statement_credits")
        .update({
          name: parsed.data.name,
          annual_amount: parsed.data.annual_amount,
          reset_month: editResetMonth,
        })
        .eq("id", editCredit.id);
      if (error) throw error;
      toast.success("Credit updated");
      closeEditDialog();
      fetchCredits();
    } catch (err) {
      toast.error("Failed to update credit");
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function updateUsed(credit: StatementCredit, newUsed: number) {
    const clamped = Math.min(Math.max(newUsed, 0), credit.annual_amount);
    try {
      const { error } = await supabase
        .from("statement_credits")
        .update({ used_amount: clamped })
        .eq("id", credit.id);
      if (error) throw error;
      setCredits((prev) =>
        prev.map((c) => (c.id === credit.id ? { ...c, used_amount: clamped } : c))
      );
    } catch (err) {
      toast.error("Failed to update credit");
      console.error(err);
    }
  }

  async function handleDelete(id: string) {
    try {
      const { error } = await supabase
        .from("statement_credits")
        .delete()
        .eq("id", id);
      if (error) throw error;
      toast.success("Credit removed");
      fetchCredits();
    } catch (err) {
      toast.error("Failed to remove credit");
      console.error(err);
    }
  }

  if (loading) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">Statement Credits</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setAddOpen(true)}
          className="gap-1"
        >
          <Plus className="w-3.5 h-3.5" />
          Add
        </Button>
      </div>

      {credits.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No credits tracked. Add annual credits (travel, dining, etc.) to monitor usage.
        </p>
      ) : (
        <div className="space-y-3">
          {credits.map((credit) => {
            const pct = Math.min((credit.used_amount / credit.annual_amount) * 100, 100);
            const remaining = credit.annual_amount - credit.used_amount;
            return (
              <div
                key={credit.id}
                className="p-3 rounded-xl border border-border bg-muted/20 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <DollarSign className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                    <span className="text-sm font-medium truncate">{credit.name}</span>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => openEditDialog(credit)}
                      className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
                      title="Edit credit"
                    >
                      <PenLine className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(credit.id)}
                      className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">
                      ${fmt(credit.used_amount)} / ${fmt(credit.annual_amount)} used
                    </span>
                    <span className="text-xs font-medium text-primary">
                      ${fmt(remaining)} left
                    </span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-primary/60 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ type: "spring", stiffness: 55, damping: 14, delay: 0.1 }}
                    />
                  </div>
                </div>

                {/* Quick update or inline exact-amount editor */}
                {editingId === credit.id ? (
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">$</span>
                      <input
                        autoFocus
                        type="number"
                        min="0"
                        max={credit.annual_amount}
                        step="0.01"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            updateUsed(credit, parseFloat(editValue) || 0);
                            setEditingId(null);
                          }
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        className="w-full h-8 pl-6 pr-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                        placeholder="0"
                      />
                    </div>
                    <button
                      onClick={() => {
                        updateUsed(credit, parseFloat(editValue) || 0);
                        setEditingId(null);
                      }}
                      className="p-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[25, 50, 75, 100].map((pctBtn) => {
                      const target = (credit.annual_amount * pctBtn) / 100;
                      return (
                        <button
                          key={pctBtn}
                          onClick={() => updateUsed(credit, target)}
                          className="text-xs px-2 py-0.5 rounded-md border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all"
                        >
                          {pctBtn}%
                        </button>
                      );
                    })}
                    <button
                      onClick={() => updateUsed(credit, credit.annual_amount)}
                      className="text-xs px-2 py-0.5 rounded-md border border-primary/30 text-primary hover:bg-primary/10 transition-all"
                    >
                      Full
                    </button>
                    <button
                      onClick={() => { setEditingId(credit.id); setEditValue(String(credit.used_amount)); }}
                      className="ml-auto p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all"
                      title="Enter exact amount"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Statement Credit</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="credit-name">Credit name</Label>
              <Input
                id="credit-name"
                placeholder="e.g. Travel credit, Dining credit"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Resets</Label>
              <div className="flex gap-2">
                {(["annual", "monthly"] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCadence(c)}
                    className={`flex-1 rounded-xl border py-2 text-sm font-medium transition-all ${
                      cadence === c
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted/30 border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {c === "annual" ? "Annually" : "Monthly"}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="reset-month">
                {cadence === "monthly" ? "Starting month" : "Resets in"}
              </Label>
              <select
                id="reset-month"
                value={resetMonth}
                onChange={(e) => setResetMonth(Number(e.target.value))}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {MONTHS.map((m, i) => (
                  <option key={i + 1} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="credit-annual">
                {cadence === "monthly" ? "Monthly value ($)" : "Annual value ($)"}
              </Label>
              <Input
                id="credit-annual"
                type="number"
                min="1"
                placeholder={cadence === "monthly" ? "e.g. 15" : "e.g. 300"}
                value={annualAmount}
                onChange={(e) => setAnnualAmount(e.target.value)}
              />
              {cadence === "monthly" && annualAmount && (
                <p className="text-xs text-muted-foreground">
                  ${(parseFloat(annualAmount) * 12 || 0).toFixed(0)}/yr total
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="credit-used">
                Already used ($){" "}
                <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Input
                id="credit-used"
                type="number"
                min="0"
                placeholder="0"
                value={usedAmount}
                onChange={(e) => setUsedAmount(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeAddDialog}>Cancel</Button>
            <Button
              onClick={handleAdd}
              disabled={!name.trim() || !annualAmount || saving}
            >
              {saving ? "Adding..." : "Add Credit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editCredit} onOpenChange={(open) => { if (!open) closeEditDialog(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Credit</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-credit-name">Credit name</Label>
              <Input
                id="edit-credit-name"
                placeholder="e.g. Travel credit, Dining credit"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Resets</Label>
              <div className="flex gap-2">
                {(["annual", "monthly"] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setEditCadence(c)}
                    className={`flex-1 rounded-xl border py-2 text-sm font-medium transition-all ${
                      editCadence === c
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted/30 border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {c === "annual" ? "Annually" : "Monthly"}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-reset-month">
                {editCadence === "monthly" ? "Starting month" : "Resets in"}
              </Label>
              <select
                id="edit-reset-month"
                value={editResetMonth}
                onChange={(e) => setEditResetMonth(Number(e.target.value))}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {MONTHS.map((m, i) => (
                  <option key={i + 1} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-credit-annual">
                {editCadence === "monthly" ? "Monthly value ($)" : "Annual value ($)"}
              </Label>
              <Input
                id="edit-credit-annual"
                type="number"
                min="1"
                placeholder={editCadence === "monthly" ? "e.g. 15" : "e.g. 300"}
                value={editAnnualAmount}
                onChange={(e) => setEditAnnualAmount(e.target.value)}
              />
              {editCadence === "monthly" && editAnnualAmount && (
                <p className="text-xs text-muted-foreground">
                  ${(parseFloat(editAnnualAmount) * 12 || 0).toFixed(0)}/yr total
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeEditDialog}>Cancel</Button>
            <Button
              onClick={handleEditSave}
              disabled={!editName.trim() || !editAnnualAmount || saving}
            >
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
