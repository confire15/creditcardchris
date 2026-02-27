"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CardTemplate, SpendingCategory } from "@/lib/types/database";
import { Search, Check, Sparkles, ArrowRight, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Step = 1 | 2 | 3;

export function OnboardingFlow({
  userId,
  templates,
  categories,
}: {
  userId: string;
  templates: CardTemplate[];
  categories: SpendingCategory[];
}) {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState<Step>(1);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const filteredTemplates = templates.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.issuer.toLowerCase().includes(search.toLowerCase())
  );

  function toggleCard(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function addSelectedCards() {
    if (selectedIds.size === 0) {
      // Skip and go to dashboard
      router.push("/dashboard");
      return;
    }

    setLoading(true);
    const selectedTemplates = templates.filter((t) => selectedIds.has(t.id));

    try {
      for (const template of selectedTemplates) {
        // Create user card
        const { data: userCard, error: cardError } = await supabase
          .from("user_cards")
          .insert({
            user_id: userId,
            card_template_id: template.id,
          })
          .select()
          .single();

        if (cardError) throw cardError;

        // Copy template rewards
        const { data: templateRewards } = await supabase
          .from("card_template_rewards")
          .select("*")
          .eq("card_template_id", template.id);

        if (templateRewards && templateRewards.length > 0) {
          await supabase.from("user_card_rewards").insert(
            templateRewards.map((r) => ({
              user_card_id: userCard.id,
              category_id: r.category_id,
              multiplier: r.multiplier,
              cap_amount: r.cap_amount,
            }))
          );
        }
      }

      setStep(3);
    } catch (err) {
      toast.error("Failed to add cards. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // Step 1: Welcome
  if (step === 1) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mb-8">
          <span className="text-2xl font-bold text-primary-foreground">C</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
          Welcome to<br />Credit Card Chris
        </h1>

        <p className="text-lg text-muted-foreground max-w-md mb-10">
          Track your rewards, optimize spending, and always know which card to use.
        </p>

        <Button size="lg" onClick={() => setStep(2)} className="gap-2 px-8">
          Get Started
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  // Step 2: Add Cards
  if (step === 2) {
    return (
      <div>
        <div className="mb-8">
          <p className="text-sm text-primary font-medium mb-2">Step 2 of 3</p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Which cards do you have?
          </h1>
          <p className="text-muted-foreground text-base mt-2">
            Select all the credit cards in your wallet.
          </p>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search cards..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="space-y-2 max-h-[50vh] overflow-y-auto mb-8 pr-1">
          {filteredTemplates.map((template) => {
            const isSelected = selectedIds.has(template.id);
            return (
              <button
                key={template.id}
                onClick={() => toggleCard(template.id)}
                className={cn(
                  "w-full flex items-center gap-3 p-4 rounded-xl border transition-all text-left",
                  isSelected
                    ? "border-primary/50 bg-primary/[0.08]"
                    : "border-white/[0.06] hover:bg-white/[0.04]"
                )}
                type="button"
              >
                <div
                  className="w-12 h-8 rounded-lg flex-shrink-0"
                  style={{ backgroundColor: template.color ?? "#6366f1" }}
                />

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{template.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {template.issuer} ·{" "}
                    {template.annual_fee > 0 ? `$${template.annual_fee}/yr` : "No annual fee"}
                  </p>
                </div>

                <div
                  className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all",
                    isSelected
                      ? "bg-primary border-primary"
                      : "border-white/20"
                  )}
                >
                  {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                </div>
              </button>
            );
          })}

          {filteredTemplates.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No cards found. Try a different search.
            </p>
          )}
        </div>

        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push("/dashboard")}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            I'll add cards later
          </button>

          <Button
            onClick={addSelectedCards}
            disabled={loading}
            className="gap-2"
          >
            {loading
              ? "Adding..."
              : selectedIds.size > 0
              ? `Continue with ${selectedIds.size} card${selectedIds.size > 1 ? "s" : ""}`
              : "Continue"}
            {!loading && <ChevronRight className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    );
  }

  // Step 3: Done
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="w-20 h-20 rounded-full bg-primary/[0.1] flex items-center justify-center mb-8">
        <Sparkles className="w-10 h-10 text-primary" />
      </div>

      <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
        You're all set!
      </h1>

      <p className="text-lg text-muted-foreground max-w-md mb-3">
        {selectedIds.size > 0
          ? `${selectedIds.size} card${selectedIds.size > 1 ? "s" : ""} added to your wallet.`
          : "Your wallet is ready."}
      </p>

      <p className="text-base text-muted-foreground max-w-md mb-10">
        Start tracking transactions to see your rewards add up.
      </p>

      <Button size="lg" onClick={() => router.push("/dashboard")} className="gap-2 px-8">
        Go to Dashboard
        <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  );
}
