"use client";

import { useState } from "react";
import { TRANSFER_PARTNERS } from "@/lib/constants/transfer-partners";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plane, Hotel, ArrowRight } from "lucide-react";

function parseRatio(ratio: string): number {
  const [from, to] = ratio.split(":").map(Number);
  return to / from;
}

export function TransferCalculator() {
  const [issuer, setIssuer] = useState<string>("Chase");
  const [points, setPoints] = useState("10000");
  const [filter, setFilter] = useState<"all" | "airline" | "hotel">("all");

  const issuers = Object.keys(TRANSFER_PARTNERS);
  const partners = TRANSFER_PARTNERS[issuer] ?? [];
  const filtered = filter === "all" ? partners : partners.filter((p) => p.type === filter);
  const inputPoints = parseInt(points.replace(/,/g, "")) || 0;

  const airlineCount = partners.filter((p) => p.type === "airline").length;
  const hotelCount = partners.filter((p) => p.type === "hotel").length;

  return (
    <div>
      <div className="mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Transfer Points</h1>
        <p className="text-muted-foreground text-base mt-2">
          See how far your points go with each transfer partner
        </p>
      </div>

      {/* Controls */}
      <div className="bg-card border border-border rounded-2xl p-8 mb-8 space-y-6">
        <div>
          <p className="text-sm font-medium mb-3">Card Issuer</p>
          <div className="flex flex-wrap gap-2">
            {issuers.map((iss) => (
              <button
                key={iss}
                onClick={() => setIssuer(iss)}
                className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                  issuer === iss
                    ? "bg-primary/10 border-primary/30 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground hover:bg-muted/40"
                }`}
              >
                {iss}
              </button>
            ))}
          </div>
        </div>

        <div className="max-w-xs">
          <p className="text-sm font-medium mb-2">Points to Transfer</p>
          <Input
            type="number"
            value={points}
            onChange={(e) => setPoints(e.target.value)}
            min="0"
            className="h-12 text-lg font-bold"
            placeholder="10000"
          />
          <p className="text-xs text-muted-foreground mt-1.5">
            {issuer} points balance
          </p>
        </div>
      </div>

      {/* Filter tabs */}
      <Tabs value={filter} onValueChange={(v) => setFilter(v as "all" | "airline" | "hotel")} className="mb-4">
        <TabsList>
          <TabsTrigger value="all">All ({partners.length})</TabsTrigger>
          <TabsTrigger value="airline">
            <Plane className="w-3.5 h-3.5 mr-1.5" />
            Airlines ({airlineCount})
          </TabsTrigger>
          <TabsTrigger value="hotel">
            <Hotel className="w-3.5 h-3.5 mr-1.5" />
            Hotels ({hotelCount})
          </TabsTrigger>
        </TabsList>
        <TabsContent value={filter} className="mt-4">
          <div className="space-y-2">
            {filtered.map((partner) => {
              const rate = parseRatio(partner.ratio);
              const received = Math.floor(inputPoints * rate);
              const isBonus = rate > 1;

              return (
                <div
                  key={partner.name}
                  className="flex items-center gap-4 p-5 rounded-2xl bg-card border border-border hover:bg-muted/20 transition-colors"
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      partner.type === "airline" ? "bg-blue-500/10" : "bg-emerald-500/10"
                    }`}
                  >
                    {partner.type === "airline" ? (
                      <Plane className="w-5 h-5 text-blue-400" />
                    ) : (
                      <Hotel className="w-5 h-5 text-emerald-400" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{partner.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {partner.ratio} transfer ratio
                      {isBonus && (
                        <span className="ml-1.5 text-emerald-400 font-medium">· Bonus!</span>
                      )}
                    </p>
                  </div>

                  {inputPoints > 0 ? (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-sm text-muted-foreground tabular-nums">
                        {inputPoints.toLocaleString()} pts
                      </span>
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      <span className={`text-base font-bold tabular-nums ${isBonus ? "text-emerald-400" : "text-primary"}`}>
                        {received.toLocaleString()}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {partner.type === "airline" ? "miles" : "pts"}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm font-medium text-muted-foreground flex-shrink-0">
                      {partner.ratio}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
