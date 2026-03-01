"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CardApplication } from "@/lib/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  MinusCircle,
  ClipboardList,
  Pencil,
  AlertTriangle,
  ShieldCheck,
  TrendingUp,
  Sparkles,
} from "lucide-react";
import { format, subMonths, subDays, isAfter, parseISO, differenceInDays } from "date-fns";

const STATUS_OPTIONS = [
  { value: "pending",   label: "Pending",   color: "text-amber-400",         bg: "bg-amber-500/10 border-amber-500/20",      Icon: Clock },
  { value: "approved",  label: "Approved",  color: "text-emerald-400",        bg: "bg-emerald-500/10 border-emerald-500/20",  Icon: CheckCircle2 },
  { value: "denied",    label: "Denied",    color: "text-red-400",            bg: "bg-red-500/10 border-red-500/20",          Icon: XCircle },
  { value: "cancelled", label: "Cancelled", color: "text-muted-foreground",   bg: "bg-muted/30 border-border",                Icon: MinusCircle },
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

// ── Velocity rule helpers ────────────────────────────────────────────────────

function approvedFrom(apps: CardApplication[], issuer: string | null, since: Date) {
  return apps.filter((a) => {
    if (a.status !== "approved") return false;
    if (issuer && a.issuer !== issuer) return false;
    return isAfter(parseISO(a.applied_date), since);
  }).length;
}

function appliedFrom(apps: CardApplication[], issuer: string | null, since: Date) {
  return apps.filter((a) => {
    if (issuer && a.issuer !== issuer) return false;
    return isAfter(parseISO(a.applied_date), since);
  }).length;
}

function velocityColor(count: number, warn: number, max: number) {
  if (count >= max) return { ring: "border-red-500/30 bg-red-500/10 text-red-400", label: "At limit" };
  if (count >= warn) return { ring: "border-amber-500/30 bg-amber-500/10 text-amber-400", label: "Caution" };
  return { ring: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400", label: "OK" };
}

// ── Component ────────────────────────────────────────────────────────────────

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

  useEffect(() => { fetchApplications(); }, [fetchApplications]);

  // ── Velocity calculations ──────────────────────────────────────────────────
  const now = new Date();

  const chase524  = approvedFrom(applications, null, subMonths(now, 24));
  const amex290   = appliedFrom(applications, "American Express", subDays(now, 90));
  const citi18    = appliedFrom(applications, "Citi", subDays(now, 8));
  const citi265   = appliedFrom(applications, "Citi", subDays(now, 65));
  const boa3mo    = appliedFrom(applications, "Bank of America", subMonths(now, 3));
  const boa12mo   = appliedFrom(applications, "Bank of America", subMonths(now, 12));
  const boa24mo   = appliedFrom(applications, "Bank of America", subMonths(now, 24));
  const cap1_6mo  = appliedFrom(applications, "Capital One", subMonths(now, 6));

  const velocityRules = [
    {
      issuer: "Chase",
      rule: "5/24",
      desc: "New accounts in last 24 months (all issuers)",
      count: chase524,
      warn: 4,
      max: 5,
      display: `${chase524} / 5`,
    },
    {
      issuer: "Amex",
      rule: "2/90",
      desc: "Amex applications in last 90 days",
      count: amex290,
      warn: 1,
      max: 2,
      display: `${amex290} / 2`,
    },
    {
      issuer: "Citi",
      rule: "1/8",
      desc: "Citi applications in last 8 days",
      count: citi18,
      warn: 1,
      max: 1,
      display: `${citi18} / 1`,
    },
    {
      issuer: "Citi",
      rule: "2/65",
      desc: "Citi applications in last 65 days",
      count: citi265,
      warn: 2,
      max: 2,
      display: `${citi265} / 2`,
    },
    {
      issuer: "BoA",
      rule: "2/3/4",
      desc: "BoA apps: 2 in 3 mo · 3 in 12 mo · 4 in 24 mo",
      count: Math.max(boa3mo >= 2 ? 3 : 0, boa12mo >= 3 ? 2 : 0, boa24mo >= 4 ? 1 : 0),
      warn: 1,
      max: 3,
      display: `${boa3mo}/${boa12mo}/${boa24mo}`,
    },
    {
      issuer: "Capital One",
      rule: "1/6",
      desc: "Capital One applications in last 6 months",
      count: cap1_6mo,
      warn: 1,
      max: 1,
      display: `${cap1_6mo} / 1`,
    },
  ];

  // ── Summary stats ──────────────────────────────────────────────────────────
  const totalApps     = applications.length;
  const pendingCount  = applications.filter((a) => a.status === "pending").length;
  const approvedCount = applications.filter((a) => a.status === "approved").length;
  const deniedCount   = applications.filter((a) => a.status === "denied").length;

  // ── Dialog helpers ─────────────────────────────────────────────────────────
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
        const { error } = await supabase.from("card_applications").update(payload).eq("id", editApp.id);
        if (error) throw error;
        toast.success("Application updated");
      } else {
        const { error } = await supabase.from("card_applications").insert(payload);
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
    const { error } = await supabase.from("card_applications").delete().eq("id", id);
    if (error) { toast.error("Failed to delete"); return; }
    toast.success("Application removed");
    setDeleteId(null);
    fetchApplications();
  }

  async function updateStatus(id: string, status: Status) {
    const { error } = await supabase.from("card_applications").update({ status }).eq("id", id);
    if (error) { toast.error("Failed to update status"); return; }
    setApplications((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
  }

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-64 bg-muted animate-pulse rounded-xl" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-muted animate-pulse rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Applications</h1>
          <p className="text-muted-foreground text-base mt-2">
            Track credit card applications and velocity limits
          </p>
        </div>
        <Button onClick={openAdd} className="flex-shrink-0">
          <Plus className="w-4 h-4 mr-2" />
          Add Application
        </Button>
      </div>

      {/* Summary stat cards */}
      {totalApps > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="bg-card border border-white/[0.06] rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <ClipboardList className="w-4 h-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Total</p>
            </div>
            <p className="text-3xl font-bold tracking-tight">{totalApps}</p>
            <p className="text-xs text-muted-foreground mt-1">Applications</p>
          </div>
          <div className="bg-amber-500/[0.06] border border-amber-500/20 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-amber-400" />
              <p className="text-xs text-amber-400/80 font-medium uppercase tracking-wide">Pending</p>
            </div>
            <p className="text-3xl font-bold tracking-tight text-amber-400">{pendingCount}</p>
            <p className="text-xs text-amber-400/60 mt-1">Awaiting decision</p>
          </div>
          <div className="bg-emerald-500/[0.06] border border-emerald-500/20 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <p className="text-xs text-emerald-400/80 font-medium uppercase tracking-wide">Approved</p>
            </div>
            <p className="text-3xl font-bold tracking-tight text-emerald-400">{approvedCount}</p>
            <p className="text-xs text-emerald-400/60 mt-1">Cards opened</p>
          </div>
          <div className="bg-red-500/[0.06] border border-red-500/20 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <XCircle className="w-4 h-4 text-red-400" />
              <p className="text-xs text-red-400/80 font-medium uppercase tracking-wide">Denied</p>
            </div>
            <p className="text-3xl font-bold tracking-tight text-red-400">{deniedCount}</p>
            <p className="text-xs text-red-400/60 mt-1">Applications</p>
          </div>
        </div>
      )}

      {/* Velocity Rules */}
      <div className="bg-card border border-white/[0.06] rounded-2xl p-6 mb-8">
        <div className="flex items-center gap-2 mb-5">
          <ShieldCheck className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-base font-semibold">Velocity Rules</h2>
          <span className="text-xs text-muted-foreground ml-1">— issuer application limits</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {velocityRules.map((rule) => {
            const { ring, label } = velocityColor(rule.count, rule.warn, rule.max);
            return (
              <div
                key={`${rule.issuer}-${rule.rule}`}
                className={`rounded-xl border p-3 text-center ${ring}`}
                title={rule.desc}
              >
                <p className="text-[10px] font-bold uppercase tracking-wider opacity-70 mb-1">{rule.issuer}</p>
                <p className="text-xs font-semibold opacity-60 mb-2">{rule.rule}</p>
                <p className="text-xl font-bold tracking-tight font-mono leading-none mb-1">{rule.display}</p>
                <p className="text-[10px] font-medium opacity-70">{label}</p>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground mt-4 leading-relaxed">
          Based on your application history. BoA 2/3/4 shows apps in last 3/12/24 months. Hover cards for details.
        </p>
      </div>

      {/* Application list */}
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
          {applications.map((app) => {
            const daysSince = differenceInDays(now, parseISO(app.applied_date));
            return (
              <div
                key={app.id}
                className="group p-5 rounded-2xl border border-white/[0.06] bg-card hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-start gap-4">
                  {/* Status indicator dot */}
                  <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                    app.status === "approved"  ? "bg-emerald-400" :
                    app.status === "pending"   ? "bg-amber-400" :
                    app.status === "denied"    ? "bg-red-400" :
                    "bg-muted-foreground"
                  }`} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2.5 flex-wrap mb-1">
                          <button
                            onClick={() => openEdit(app)}
                            className="font-semibold text-base hover:text-primary transition-colors truncate"
                          >
                            {app.card_name}
                          </button>
                          <StatusBadge status={app.status} />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {app.issuer}
                          {" · "}
                          {format(parseISO(app.applied_date), "MMM d, yyyy")}
                          {" · "}
                          {daysSince === 0 ? "Today" : `${daysSince}d ago`}
                          {app.annual_fee > 0 ? ` · $${app.annual_fee}/yr` : " · No annual fee"}
                          {app.credit_score_used ? ` · Score: ${app.credit_score_used}` : ""}
                        </p>
                        {app.bonus_offer && (
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                            <p className="text-sm text-primary font-medium">{app.bonus_offer}</p>
                          </div>
                        )}
                        {app.notes && (
                          <p className="text-xs text-muted-foreground mt-1 italic">{app.notes}</p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Select
                          value={app.status}
                          onValueChange={(val) => updateStatus(app.id, val as Status)}
                        >
                          <SelectTrigger className="h-8 w-[110px] text-xs">
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
                          className="h-8 w-8 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-all"
                          onClick={() => openEdit(app)}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
                          onClick={() => setDeleteId(app.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editApp ? "Edit Application" : "Add Application"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div className="col-span-2 space-y-1.5">
              <Label>Card Name</Label>
              <Input
                placeholder="e.g. Chase Sapphire Preferred"
                value={form.card_name}
                onChange={(e) => setForm({ ...form, card_name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Issuer</Label>
                <Select value={form.issuer} onValueChange={(val) => setForm({ ...form, issuer: val })}>
                  <SelectTrigger><SelectValue placeholder="Select issuer" /></SelectTrigger>
                  <SelectContent>
                    {ISSUERS.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(val) => setForm({ ...form, status: val as Status })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
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
            </div>

            <div className="space-y-1.5">
              <Label>Bonus Offer</Label>
              <Input
                placeholder="e.g. 80,000 pts after $4k spend in 3 months"
                value={form.bonus_offer}
                onChange={(e) => setForm({ ...form, bonus_offer: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Credit Score Used <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input
                type="number"
                min="300"
                max="850"
                placeholder="e.g. 750"
                value={form.credit_score_used}
                onChange={(e) => setForm({ ...form, credit_score_used: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Notes <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input
                placeholder="Any notes about this application..."
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setDialogOpen(false)}>
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
