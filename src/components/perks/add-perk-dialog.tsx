"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { CardPerk, CardPerkTemplate, UserCard } from "@/lib/types/database";
import { getCardName } from "@/lib/utils/rewards";
import { cardPerkSchema } from "@/lib/validations/forms";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Sparkles, Plus } from "lucide-react";
import { toast } from "sonner";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const PERK_TYPES = [
  { value: "credit",     label: "Statement Credit" },
  { value: "lounge",     label: "Lounge Access" },
  { value: "free_night", label: "Free Night" },
  { value: "status",     label: "Elite Status" },
  { value: "other",      label: "Other Benefit" },
];
const VALUE_TYPES = [
  { value: "dollar",  label: "Dollar amount (e.g. $300 credit)" },
  { value: "count",   label: "Fixed uses (e.g. 2 free nights)" },
  { value: "boolean", label: "On/off benefit (e.g. lounge access)" },
];
const CADENCES = [
  { value: "annual",        label: "Annual (card anniversary)" },
  { value: "calendar_year", label: "Calendar year (Jan 1)" },
  { value: "monthly",       label: "Monthly" },
];

export function AddPerkDialog({
  userId,
  cards,
  perk,
  open,
  onOpenChange,
  onSaved,
}: {
  userId: string;
  cards: UserCard[];
  perk?: CardPerk;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSaved: () => void;
}) {
  const supabase = createClient();
  const isEdit = !!perk;

  const [mode, setMode] = useState<"template" | "manual">(isEdit ? "manual" : "template");
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<CardPerkTemplate[]>([]);
  const [selectedCardId, setSelectedCardId] = useState(perk?.user_card_id ?? "");
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<Set<string>>(new Set());
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  // Manual form fields
  const [name, setName] = useState(perk?.name ?? "");
  const [description, setDescription] = useState(perk?.description ?? "");
  const [perkType, setPerkType] = useState(perk?.perk_type ?? "credit");
  const [valueType, setValueType] = useState(perk?.value_type ?? "dollar");
  const [annualValue, setAnnualValue] = useState(perk?.annual_value ? String(perk.annual_value) : "");
  const [annualCount, setAnnualCount] = useState(perk?.annual_count ? String(perk.annual_count) : "");
  const [cadence, setCadence] = useState(perk?.reset_cadence ?? "annual");
  const [resetMonth, setResetMonth] = useState(perk?.reset_month ?? 1);
  const [notifyEnabled, setNotifyEnabled] = useState(perk?.notify_before_reset ?? true);
  const [notifyDays, setNotifyDays] = useState(String(perk?.notify_days_before ?? 30));

  useEffect(() => {
    if (!open) return;
    if (isEdit) { setMode("manual"); return; }
    setMode("template");
    setSelectedCardId("");
    setSelectedTemplateIds(new Set());
    setTemplates([]);
  }, [open, isEdit]);

  async function fetchTemplates(cardId: string) {
    const card = cards.find((c) => c.id === cardId);
    if (!card?.card_template_id) { setTemplates([]); return; }
    setLoadingTemplates(true);
    const { data } = await supabase
      .from("card_perk_templates")
      .select("*")
      .eq("card_template_id", card.card_template_id)
      .order("sort_order");
    setTemplates(data ?? []);
    setSelectedTemplateIds(new Set((data ?? []).map((t) => t.id)));
    setLoadingTemplates(false);
  }

  async function handleCardSelect(cardId: string) {
    setSelectedCardId(cardId);
    if (mode === "template") fetchTemplates(cardId);
  }

  async function handleImportTemplates() {
    if (!selectedCardId || selectedTemplateIds.size === 0) return;
    setLoading(true);
    try {
      const toInsert = templates
        .filter((t) => selectedTemplateIds.has(t.id))
        .map((t, i) => ({
          user_id: userId,
          user_card_id: selectedCardId,
          card_perk_template_id: t.id,
          name: t.name,
          description: t.description,
          perk_type: t.perk_type,
          value_type: t.value_type,
          annual_value: t.annual_value,
          annual_count: t.annual_count,
          reset_cadence: t.reset_cadence,
          reset_month: 1,
          sort_order: i,
        }));
      const { error } = await supabase.from("card_perks").insert(toInsert);
      if (error) throw error;
      toast.success(`${toInsert.length} perk${toInsert.length !== 1 ? "s" : ""} added`);
      onOpenChange(false);
      onSaved();
    } catch {
      toast.error("Failed to add perks");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveManual(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const parsed = cardPerkSchema.safeParse({
        name,
        description: description || null,
        perk_type: perkType,
        value_type: valueType,
        annual_value: valueType === "dollar" && annualValue ? parseFloat(annualValue) : null,
        annual_count: valueType === "count" && annualCount ? parseInt(annualCount) : null,
        reset_cadence: cadence,
        reset_month: resetMonth,
        notify_before_reset: notifyEnabled,
        notify_days_before: parseInt(notifyDays) || 30,
      });
      if (!parsed.success) {
        toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
        setLoading(false);
        return;
      }

      const payload = {
        ...parsed.data,
        user_id: userId,
        user_card_id: selectedCardId,
      };

      const { error } = isEdit
        ? await supabase.from("card_perks").update(payload).eq("id", perk!.id)
        : await supabase.from("card_perks").insert(payload);

      if (error) throw error;
      toast.success(isEdit ? "Perk updated" : "Perk added");
      onOpenChange(false);
      onSaved();
    } catch {
      toast.error("Failed to save perk");
    } finally {
      setLoading(false);
    }
  }

  const selectedCard = cards.find((c) => c.id === selectedCardId);
  const hasTemplates = templates.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Perk" : "Add Perks"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {/* Card picker */}
          <div className="space-y-2">
            <Label>Card</Label>
            <Select value={selectedCardId} onValueChange={handleCardSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Select a card" />
              </SelectTrigger>
              <SelectContent>
                {cards.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {getCardName(c)}{c.last_four ? ` ••${c.last_four}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Mode toggle (only for add) */}
          {!isEdit && selectedCardId && (
            <div className="flex rounded-xl border border-border overflow-hidden">
              <button
                type="button"
                onClick={() => { setMode("template"); fetchTemplates(selectedCardId); }}
                className={`flex-1 text-sm py-2 px-3 transition-colors ${mode === "template" ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Sparkles className="w-3.5 h-3.5 inline mr-1.5" />
                Suggested perks
              </button>
              <button
                type="button"
                onClick={() => setMode("manual")}
                className={`flex-1 text-sm py-2 px-3 transition-colors ${mode === "manual" ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Plus className="w-3.5 h-3.5 inline mr-1.5" />
                Manual
              </button>
            </div>
          )}

          {/* Template import mode */}
          {!isEdit && mode === "template" && selectedCardId && (
            <div>
              {loadingTemplates ? (
                <div className="space-y-2">
                  {[1,2,3].map(i => <div key={i} className="h-14 bg-muted animate-pulse rounded-xl" />)}
                </div>
              ) : !hasTemplates ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  No suggested perks for this card yet.
                  <button
                    type="button"
                    onClick={() => setMode("manual")}
                    className="block mx-auto mt-2 text-primary hover:underline"
                  >
                    Add manually instead
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Suggested perks for{" "}
                    <span className="font-medium text-foreground">
                      {selectedCard?.card_template?.name ?? getCardName(selectedCard!)}
                    </span>
                  </p>
                  <div className="space-y-2">
                    {templates.map((t) => (
                      <label
                        key={t.id}
                        className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                          selectedTemplateIds.has(t.id)
                            ? "border-primary/30 bg-primary/[0.06]"
                            : "border-border hover:border-border/80"
                        }`}
                      >
                        <Checkbox
                          checked={selectedTemplateIds.has(t.id)}
                          onCheckedChange={(checked) => {
                            const next = new Set(selectedTemplateIds);
                            if (checked) next.add(t.id); else next.delete(t.id);
                            setSelectedTemplateIds(next);
                          }}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{t.name}</p>
                          {t.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">{t.description}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-0.5 capitalize">
                            {t.reset_cadence.replace("_", " ")} reset
                          </p>
                        </div>
                        {t.annual_value && (
                          <span className="text-sm font-semibold text-primary flex-shrink-0">
                            ${t.annual_value.toFixed(0)}
                          </span>
                        )}
                      </label>
                    ))}
                  </div>
                  <Button
                    className="w-full"
                    onClick={handleImportTemplates}
                    disabled={loading || selectedTemplateIds.size === 0}
                  >
                    {loading ? "Adding..." : `Add ${selectedTemplateIds.size} perk${selectedTemplateIds.size !== 1 ? "s" : ""}`}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Manual form */}
          {(isEdit || mode === "manual") && selectedCardId && (
            <form onSubmit={handleSaveManual} className="space-y-4">
              <div className="space-y-2">
                <Label>Perk name</Label>
                <Input
                  placeholder="e.g. $300 Travel Credit"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Description <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Input
                  placeholder="e.g. Applies to Chase Travel bookings"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Perk type</Label>
                  <Select value={perkType} onValueChange={setPerkType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PERK_TYPES.map((p) => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Value type</Label>
                  <Select value={valueType} onValueChange={setValueType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {VALUE_TYPES.map((v) => (
                        <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {valueType === "dollar" && (
                <div className="space-y-2">
                  <Label>Annual value ($)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                    <Input
                      type="number"
                      step="0.01"
                      min="1"
                      placeholder="300"
                      value={annualValue}
                      onChange={(e) => setAnnualValue(e.target.value)}
                      className="pl-7"
                      required
                    />
                  </div>
                </div>
              )}

              {valueType === "count" && (
                <div className="space-y-2">
                  <Label>Total uses per year</Label>
                  <Input
                    type="number"
                    min="1"
                    max="99"
                    placeholder="e.g. 2"
                    value={annualCount}
                    onChange={(e) => setAnnualCount(e.target.value)}
                    required
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Reset cadence</Label>
                  <Select value={cadence} onValueChange={setCadence}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CADENCES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {cadence !== "monthly" && (
                  <div className="space-y-2">
                    <Label>Reset month</Label>
                    <Select value={String(resetMonth)} onValueChange={(v) => setResetMonth(parseInt(v))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {MONTHS.map((m, i) => (
                          <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="space-y-3 pt-1">
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="notify"
                    checked={notifyEnabled}
                    onCheckedChange={(c) => setNotifyEnabled(!!c)}
                  />
                  <Label htmlFor="notify" className="font-normal cursor-pointer">
                    Remind me before reset
                  </Label>
                </div>
                {notifyEnabled && (
                  <div className="flex items-center gap-2 pl-7">
                    <Input
                      type="number"
                      min="1"
                      max="90"
                      value={notifyDays}
                      onChange={(e) => setNotifyDays(e.target.value)}
                      className="w-20"
                    />
                    <span className="text-sm text-muted-foreground">days before reset</span>
                  </div>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={loading || !name.trim() || !selectedCardId}>
                {loading ? "Saving..." : isEdit ? "Save Changes" : "Add Perk"}
              </Button>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
