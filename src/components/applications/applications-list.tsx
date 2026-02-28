"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CardApplication } from "@/lib/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Plus, Trash2, CheckCircle2, XCircle, Clock, MinusCircle, ClipboardList } from "lucide-react";
import { format, subMonths, isAfter, parseISO } from "date-fns";

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20", Icon: Clock },
  { value: "approved", label: "Approved", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", Icon: CheckCircle2 },
  { value: "denied", label: "Denied", color: "text-red-400", bg: "bg-red-500/10 border-red-500/20", Icon: XCircle },
  { value: "cancelled", label: "Cancelled", color: "text-muted-foreground", bg: "bg-muted/30 border-white/[0.06]", Icon: MinusCircle },
] as const;

type Status = "pending" | "approved" | "denied" | "cancelled";

const ISSUERS = [
  "American Express", "Bank of America", "Barclays", "Capital One",
  "Chase", "Citi", "Discover", "HSBC", "Navy Federal",
  "US Bank", "Wells Fargo", "Other",
];

function StatusBadge({ status }: { status: Status }) {
  const opt = STATUS_OPTIONS.find((s) => s.value === status)!;
  const { Icon } = opt;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${opt.bg} ${opt.color}`}>
      <Icon className="w-3 h-3" />
      {opt.label}
    </span>
  );
}

type FormData = {
  card_name: string;
  issuer: string;
  applied_date: string;
  status: Status;
  bonus_offer: string;
  annual_fee: string;
  credit_score_used: string;
  notes: string;
};

const DEFAULT_FORM: FormData = {
  card_name: "",
  issuer: "",
  applied_date: new Date().toISOString().slice(0, 10),
  status: "pending",
  bonus_offer: "",
  annual_fee: "0",
  credit_score_used: "",
  notes: "",
};

export function ApplicationsList({ userId }: { userId: string }) {
  const [applications, setApplications] = useState<CardApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editApp, setEditApp] = useState<CardApplication | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  const fetchApplications = useCallback(async () => {
    const { data } = await supabase
      .from("card_applications")
      .select("*")
      .eq("user_id", userId)
      .order("applied_date", { ascending: false });
    setApplications((data as CardApplication[]) ?? []);
    setLoading(false);
  }, [userId, supabase]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  // 5/24 rule: cards approved in last 24 months
  const twentyFourMonthsAgo = subMonths(new Date(), 24);
  const approvedLast24 = applications.filter(
    (a) =>
      a.status === "approved" &&
      isAfter(parseISO(a.applied_date), twentyFourMonthsAgo)
  ).length;

  function openAdd() {
    setEditApp(null);
    setForm(DEFAULT_FORM);
    setDialogOpen(true);
  }

  function openEdit(app: CardApplication) {
    setEditApp(app);
    setForm({
      card_name: app.card_name,
      issuer: app.issuer,
      applied_date: app.applied_date,
      status: app.status,
      bonus_offer: app.bonus_offer ?? "",
      annual_fee: String(app.annual_fee),
      credit_score_used: app.credit_score_used ? String(app.credit_score_used) : "",
      notes: app.notes ?? "",
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.card_name.trim() || !form.issuer.trim()) {
      toast.error("Card name and issuer are required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        user_id: userId,
        card_name: form.card_name.trim(),
        issuer: form.issuer.trim(),
        applied_date: form.applied_date,
        status: form.status,
        bonus_offer: form.bonus_offer.trim() || null,
        annual_fee: parseFloat(form.annual_fee) || 0,
        credit_score_used: form.credit_score_used ? parseInt(form.credit_score_used) : null,
        notes: form.notes.trim() || null,
      };

      if (editApp) {
        const { error } = await supabase
          .from("card_applications")
          .update(payload)
          .eq("id", editApp.id);
        if (error) throw error;
        toast.success("Application updated");
      } else {
        const { error } = await supabase
          .from("card_applications")
          .insert(payload);
        if (error) throw error;
        toast.success("Application added");
      }

      setDialogOpen(false);
      fetchApplications();
    } catch (err) {
      toast.error("Failed to save application");
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const { error } = await supabase
      .from("card_applications")
      .delete()
      .eq("id", id);
    if (error) {
      toast.error("Failed to delete");
      return;
    }
    toast.success("Application removed");
    setDeleteId(null);
    fetchApplications();
  }

  async function updateStatus(id: string, status: Status) {
    const { error } = await supabase
      .from("card_applications")
      .update({ status })
      .eq("id", id);
    if (error) {
      toast.error("Failed to update status");
      return;
    }
    setApplications((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status } : a))
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-64 bg-muted animate-pulse rounded-xl" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Applications</h1>
          <p className="text-muted-foreground text-base mt-2">
            Track your credit card applications and approvals
          </p>
        </div>
        <Button onClick={openAdd} className="flex-shrink-0">
          <Plus className="w-4 h-4 mr-2" />
          Add Application
        </Button>
      </div>

      {/* 5/24 tracker */}
      <div className="mb-8 p-5 rounded-2xl border border-white/[0.06] bg-card flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Chase 5/24 Status</p>
          <p className="text-2xl font-bold mt-1">
            {approvedLast24}
            <span className="text-lg text-muted-foreground font-normal"> / 5 slots used</span>
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Approved cards opened in the last 24 months
          </p>
        </div>
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold flex-shrink-0 ${
          approvedLast24 >= 5
            ? "bg-red-500/10 border border-red-500/20 text-red-400"
            : approvedLast24 >= 4
            ? "bg-amber-500/10 border border-amber-500/20 text-amber-400"
            : "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
        }`}>
          {approvedLast24}
        </div>
      </div>

      {applications.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-white/[0.06] rounded-2xl">
          <ClipboardList className="w-14 h-14 mx-auto text-muted-foreground mb-5" />
          <h3 className="text-xl font-semibold mb-3">No applications yet</h3>
          <p className="text-muted-foreground text-base max-w-sm mx-auto mb-6">
            Track your credit card applications, approvals, and bonus offers in one place.
          </p>
          <Button onClick={openAdd}>
            <Plus className="w-4 h-4 mr-2" />
            Add Your First Application
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {applications.map((app) => (
            <div
              key={app.id}
              className="p-5 rounded-2xl border border-white/[0.06] bg-card hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap mb-1">
                    <button
                      onClick={() => openEdit(app)}
                      className="font-semibold text-base hover:text-primary transition-colors"
                    >
                      {app.card_name}
                    </button>
                    <StatusBadge status={app.status} />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {app.issuer} · Applied {format(parseISO(app.applied_date), "MMM d, yyyy")}
                    {app.annual_fee > 0 ? ` · $${app.annual_fee}/yr` : " · No annual fee"}
                  </p>
                  {app.bonus_offer && (
                    <p className="text-sm text-primary mt-1.5 font-medium">
                      Bonus: {app.bonus_offer}
                    </p>
                  )}
                  {app.notes && (
                    <p className="text-xs text-muted-foreground mt-1">{app.notes}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Quick status update */}
                  <Select
                    value={app.status}
                    onValueChange={(val) => updateStatus(app.id, val as Status)}
                  >
                    <SelectTrigger className="h-8 w-28 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => setDeleteId(app.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editApp ? "Edit Application" : "Add Application"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label>Card Name</Label>
                <Input
                  placeholder="e.g. Chase Sapphire Preferred"
                  value={form.card_name}
                  onChange={(e) => setForm({ ...form, card_name: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Issuer</Label>
                <Select
                  value={form.issuer}
                  onValueChange={(val) => setForm({ ...form, issuer: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select issuer" />
                  </SelectTrigger>
                  <SelectContent>
                    {ISSUERS.map((i) => (
                      <SelectItem key={i} value={i}>
                        {i}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(val) => setForm({ ...form, status: val as Status })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Date Applied</Label>
                <Input
                  type="date"
                  value={form.applied_date}
                  onChange={(e) => setForm({ ...form, applied_date: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Annual Fee</Label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                  <Input
                    type="number"
                    min="0"
                    className="pl-6"
                    value={form.annual_fee}
                    onChange={(e) => setForm({ ...form, annual_fee: e.target.value })}
                  />
                </div>
              </div>

              <div className="col-span-2 space-y-1.5">
                <Label>Bonus Offer</Label>
                <Input
                  placeholder="e.g. 80,000 pts after $4k spend in 3 months"
                  value={form.bonus_offer}
                  onChange={(e) => setForm({ ...form, bonus_offer: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Credit Score Used</Label>
                <Input
                  type="number"
                  min="300"
                  max="850"
                  placeholder="e.g. 750"
                  value={form.credit_score_used}
                  onChange={(e) => setForm({ ...form, credit_score_used: e.target.value })}
                />
              </div>

              <div className="col-span-2 space-y-1.5">
                <Label>Notes</Label>
                <Input
                  placeholder="Any notes about this application..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : editApp ? "Save Changes" : "Add Application"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove application?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this application record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => deleteId && handleDelete(deleteId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
