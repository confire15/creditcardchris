"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CardApplication, UserCard } from "@/lib/types/database";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PremiumGate } from "@/components/premium/premium-gate";
import { format } from "date-fns";
import { ISSUER_RULES, evaluateIssuerRule } from "@/lib/constants/issuer-rules";
import { ApplicationVerdict } from "./application-verdict";

export function ApplicationsPage({ isPremium }: { isPremium: boolean }) {
  const supabase = createClient();
  const [apps, setApps] = useState<CardApplication[]>([]);
  const [cards, setCards] = useState<UserCard[]>([]);
  const [open, setOpen] = useState(false);
  const [issuer, setIssuer] = useState("");
  const [appliedOn, setAppliedOn] = useState(new Date().toISOString().slice(0, 10));

  const loadApps = async () => {
    if (!isPremium) return;
    const res = await fetch("/api/applications");
    const data = await res.json().catch(() => ({}));
    if (res.ok) setApps(data?.applications ?? []);
    const { data: userCards } = await supabase
      .from("user_cards")
      .select("*, card_template:card_templates(*)")
      .eq("is_active", true);
    setCards((userCards as UserCard[]) ?? []);
  };

  useEffect(() => {
    void loadApps();
  }, [isPremium]);

  const save = async () => {
    await fetch("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ issuer, appliedOn }),
    });
    setOpen(false);
    setIssuer("");
    void loadApps();
  };

  return (
    <div className="space-y-4">
      <PageHeader
        className="mb-0"
        title="Applications"
        actions={isPremium ? <Button onClick={() => setOpen(true)}>Log application</Button> : null}
      />

      <PremiumGate
        isPremium={isPremium}
        label="Unlock issuer rules with Premium"
        preview={<div className="h-24 rounded-xl bg-muted" />}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {ISSUER_RULES.map((rule) => {
            const verdict = evaluateIssuerRule(rule.issuer, apps, cards, { is_business: false });
            return (
              <div key={rule.issuer} className="rounded-2xl border border-overlay-subtle bg-card p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold">{rule.issuer}</p>
                  <ApplicationVerdict isPremium={isPremium} verdict={verdict} />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {verdict.status === "safe" ? "No cooldown detected from your logged applications." : verdict.reason}
                </p>
              </div>
            );
          })}
        </div>

        <div className="space-y-2">
          <p className="text-sm font-semibold">Application timeline</p>
          {apps.length === 0 && (
            <div className="rounded-2xl border border-overlay-subtle bg-card p-4 text-sm text-muted-foreground">
              No applications logged yet.
            </div>
          )}
          {apps.map((app) => (
            <div key={app.id} className="rounded-2xl border border-overlay-subtle bg-card p-4">
              <p className="text-sm font-semibold">{app.custom_card_name ?? app.issuer}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {app.issuer} · {format(new Date(app.applied_on), "MMM d, yyyy")} · {app.outcome}
              </p>
            </div>
          ))}
        </div>
      </PremiumGate>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log application</DialogTitle>
            <DialogDescription className="sr-only">
              Record a card application with issuer and date
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input value={issuer} onChange={(e) => setIssuer(e.target.value)} placeholder="Issuer (e.g., Chase)" />
            <Input type="date" value={appliedOn} onChange={(e) => setAppliedOn(e.target.value)} />
            <Button onClick={save} className="w-full">Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
