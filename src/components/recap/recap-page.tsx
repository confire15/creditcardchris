"use client";

import { useState } from "react";
import { YearRecap } from "@/lib/utils/recap";
import { formatCurrency } from "@/lib/utils/format";
import { Button } from "@/components/ui/button";
import { PremiumGate } from "@/components/premium/premium-gate";

export function RecapPage({
  isPremium,
  recap,
  availableYears,
}: {
  isPremium: boolean;
  recap: YearRecap | null;
  availableYears: number[];
}) {
  const [year, setYear] = useState(recap?.year ?? new Date().getFullYear());

  const handleYearChange = (value: number) => {
    setYear(value);
    window.location.href = `/recap?year=${value}`;
  };

  const shareImage = () => {
    if (!recap) return;
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 630;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#0e1014";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#d4621a";
    ctx.font = "700 46px sans-serif";
    ctx.fillText(`Credit Card Chris ${recap.year} Recap`, 70, 95);
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 82px sans-serif";
    ctx.fillText(formatCurrency(recap.netValue), 70, 220);
    ctx.font = "400 34px sans-serif";
    ctx.fillText(`Net value across ${recap.totalCardsHeld} cards`, 70, 275);
    ctx.fillStyle = "#b8bec8";
    ctx.font = "400 30px sans-serif";
    ctx.fillText(`Credits: ${formatCurrency(recap.totalCreditsCaptured)} of ${formatCurrency(recap.totalCreditsAvailable)}`, 70, 355);
    ctx.fillText(`SUBs earned: ${formatCurrency(recap.totalSubsEarned)}`, 70, 405);
    ctx.fillText(`Fees paid: ${formatCurrency(recap.totalAnnualFeesPaid)}`, 70, 455);
    const ownerTag = recap.topCardByValue.ownerLabel ? ` (${recap.topCardByValue.ownerLabel})` : "";
    ctx.fillText(`Top earner: ${recap.topCardByValue.name}${ownerTag}`, 70, 505);

    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `recap-${recap.year}.png`;
    link.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Year in Review</h1>
        <select
          value={year}
          onChange={(e) => handleYearChange(Number(e.target.value))}
          className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm"
        >
          {availableYears.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </div>

      <PremiumGate
        isPremium={isPremium}
        label="Unlock your full year-end recap with Premium"
        preview={<div className="h-56 rounded-2xl bg-muted" />}
      >
        {recap && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-overlay-subtle bg-card p-6">
              <p className="text-sm text-muted-foreground">You netted</p>
              <p className="text-4xl font-bold mt-1">{formatCurrency(recap.netValue)}</p>
              <p className="text-sm text-muted-foreground mt-1">across {recap.totalCardsHeld} cards</p>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="rounded-2xl border border-overlay-subtle bg-card p-4 text-sm">
                Credits captured: {formatCurrency(recap.totalCreditsCaptured)} of {formatCurrency(recap.totalCreditsAvailable)}
              </div>
              <div className="rounded-2xl border border-overlay-subtle bg-card p-4 text-sm">
                SUBs earned: {formatCurrency(recap.totalSubsEarned)}
              </div>
              <div className="rounded-2xl border border-overlay-subtle bg-card p-4 text-sm">
                Fees paid: {formatCurrency(recap.totalAnnualFeesPaid)}
              </div>
              <div className="rounded-2xl border border-overlay-subtle bg-card p-4 text-sm">
                Top earner: {recap.topCardByValue.name}
                {recap.topCardByValue.ownerLabel ? ` (${recap.topCardByValue.ownerLabel})` : ""}
              </div>
            </div>
            <Button onClick={shareImage}>Share image</Button>
          </div>
        )}
      </PremiumGate>
    </div>
  );
}
