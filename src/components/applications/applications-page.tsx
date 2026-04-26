"use client";

import { useEffect, useState } from "react";
import { CardApplication } from "@/lib/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PremiumGate } from "@/components/premium/premium-gate";
import { format } from "date-fns";

export function ApplicationsPage({ isPremium }: { isPremium: boolean }) {
  const [apps, setApps] = useState<CardApplication[]>([]);
  const [open, setOpen] = useState(false);
  const [issuer, setIssuer] = useState("");
  const [appliedOn, setAppliedOn] = useState(new Date().toISOString().slice(0, 10));

  const loadApps = async () => {
    if (!isPremium) return;
    const res = await fetch("/api/applications");
    const data = await res.json().catch(() => ({}));
    if (res.ok) setApps(data?.applications ?? []);
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
      <div className="flex items-center justify-between">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Applications</h1>
        {isPremium && <Button onClick={() => setOpen(true)}>Log application</Button>}
      </div>

      <PremiumGate
        isPremium={isPremium}
        label="Unlock issuer rules with Premium"
        preview={<div className="h-24 rounded-xl bg-muted" />}
      >
        <div className="space-y-2">
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
