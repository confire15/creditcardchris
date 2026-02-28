"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Papa from "papaparse";
import { createClient } from "@/lib/supabase/client";
import { UserCard, SpendingCategory } from "@/lib/types/database";
import { getCardName } from "@/lib/utils/rewards";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, FileText, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

type ParsedRow = Record<string, string>;

const NONE = "__none__";

export function ImportCsvDialog({
  userId,
  onImported,
  children,
}: {
  userId: string;
  onImported: () => void;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"upload" | "map" | "preview" | "done">("upload");
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [importCount, setImportCount] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const [cards, setCards] = useState<UserCard[]>([]);
  const [categories, setCategories] = useState<SpendingCategory[]>([]);
  const supabase = createClient();

  const fetchData = useCallback(async () => {
    const [cardsRes, catsRes] = await Promise.all([
      supabase.from("user_cards").select("*, card_template:card_templates(*)").eq("user_id", userId).eq("is_active", true),
      supabase.from("spending_categories").select("*").order("display_name"),
    ]);
    setCards(cardsRes.data ?? []);
    setCategories(catsRes.data ?? []);
  }, [userId, supabase]);

  useEffect(() => {
    if (open) fetchData();
  }, [open, fetchData]);

  // Column mapping
  const [colDate, setColDate] = useState(NONE);
  const [colMerchant, setColMerchant] = useState(NONE);
  const [colAmount, setColAmount] = useState(NONE);
  const [colCategory, setColCategory] = useState(NONE);

  // Default card + category for all rows
  const [defaultCardId, setDefaultCardId] = useState(NONE);
  const [defaultCategoryId, setDefaultCategoryId] = useState(NONE);

  function reset() {
    setStep("upload");
    setRows([]);
    setHeaders([]);
    setColDate(NONE);
    setColMerchant(NONE);
    setColAmount(NONE);
    setColCategory(NONE);
    setDefaultCardId(NONE);
    setDefaultCategoryId(NONE);
    setImportCount(0);
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse<ParsedRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const h = result.meta.fields ?? [];
        setHeaders(h);
        setRows(result.data.slice(0, 500)); // cap at 500 rows

        // Auto-detect common column names
        const find = (candidates: string[]) =>
          h.find((col) =>
            candidates.some((c) => col.toLowerCase().includes(c))
          ) ?? NONE;

        setColDate(find(["date", "posted", "transaction date"]));
        setColMerchant(find(["merchant", "description", "payee", "name"]));
        setColAmount(find(["amount", "debit", "charge", "total"]));
        setColCategory(find(["category", "type"]));
        setStep("map");
      },
      error: () => toast.error("Failed to parse CSV"),
    });

    // Reset file input
    if (fileRef.current) fileRef.current.value = "";
  }

  // Build preview of first 5 rows with mapped values
  const preview = rows.slice(0, 5).map((row) => ({
    date: colDate !== NONE ? row[colDate] : "",
    merchant: colMerchant !== NONE ? row[colMerchant] : "",
    amount: colAmount !== NONE ? row[colAmount] : "",
  }));

  function parseAmount(raw: string): number | null {
    // Remove currency symbols, commas, parentheses for negatives
    const cleaned = raw.replace(/[$,]/g, "").replace(/\((.+)\)/, "-$1").trim();
    const n = parseFloat(cleaned);
    return isNaN(n) ? null : Math.abs(n);
  }

  function parseDate(raw: string): string | null {
    // Try to parse as a date and return YYYY-MM-DD
    const d = new Date(raw);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 10);
  }

  async function handleImport() {
    if (!defaultCategoryId || defaultCategoryId === NONE) {
      toast.error("Please select a default category");
      return;
    }
    if (colDate === NONE || colAmount === NONE) {
      toast.error("Date and amount columns are required");
      return;
    }

    setImporting(true);

    const toInsert = rows
      .map((row) => {
        const date = parseDate(colDate !== NONE ? row[colDate] : "");
        const amount = parseAmount(colAmount !== NONE ? row[colAmount] : "");
        if (!date || amount === null || amount <= 0) return null;

        return {
          user_id: userId,
          user_card_id: defaultCardId !== NONE ? defaultCardId : null,
          category_id: defaultCategoryId,
          amount,
          merchant: colMerchant !== NONE ? (row[colMerchant] || null) : null,
          transaction_date: date,
          rewards_earned: null,
        };
      })
      .filter(Boolean);

    if (toInsert.length === 0) {
      toast.error("No valid rows found. Check your date and amount columns.");
      setImporting(false);
      return;
    }

    try {
      // Insert in chunks of 100
      for (let i = 0; i < toInsert.length; i += 100) {
        const chunk = toInsert.slice(i, i + 100);
        const { error } = await supabase.from("transactions").insert(chunk);
        if (error) throw error;
      }
      setImportCount(toInsert.length);
      setStep("done");
      onImported();
    } catch (err) {
      toast.error("Import failed");
      console.error(err);
    } finally {
      setImporting(false);
    }
  }

  const canProceed =
    colDate !== NONE && colAmount !== NONE && defaultCategoryId !== NONE;

  return (
    <>
      <div onClick={() => { reset(); setOpen(true); }}>
        {children ?? (
          <Button variant="outline" size="sm" className="gap-1.5">
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">Import CSV</span>
          </Button>
        )}
      </div>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Import Transactions from CSV</DialogTitle>
          </DialogHeader>

          {/* Step 1: Upload */}
          {step === "upload" && (
            <div className="py-4">
              <label className="flex flex-col items-center gap-4 p-10 border-2 border-dashed border-border rounded-2xl cursor-pointer hover:border-primary/40 hover:bg-primary/[0.02] transition-all">
                <Upload className="w-10 h-10 text-muted-foreground" />
                <div className="text-center">
                  <p className="font-medium">Upload a CSV file</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Export from your bank or credit card portal
                  </p>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFile}
                />
              </label>
              <p className="text-xs text-muted-foreground text-center mt-4">
                Max 500 rows per import
              </p>
            </div>
          )}

          {/* Step 2: Map columns */}
          {step === "map" && (
            <div className="py-2 space-y-5">
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 rounded-xl px-3 py-2">
                <FileText className="w-4 h-4 flex-shrink-0" />
                {rows.length} rows detected
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium">Map your columns</p>

                {[
                  { label: "Date *", value: colDate, set: setColDate, required: true },
                  { label: "Amount *", value: colAmount, set: setColAmount, required: true },
                  { label: "Merchant", value: colMerchant, set: setColMerchant, required: false },
                ].map(({ label, value, set }) => (
                  <div key={label} className="flex items-center gap-3">
                    <span className="text-sm w-28 flex-shrink-0 text-muted-foreground">{label}</span>
                    <Select value={value} onValueChange={set}>
                      <SelectTrigger className="h-9 text-sm flex-1">
                        <SelectValue placeholder="Select column" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>— skip —</SelectItem>
                        {headers.map((h) => (
                          <SelectItem key={h} value={h}>{h}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>

              <div className="space-y-3 pt-2 border-t border-border">
                <p className="text-sm font-medium">Defaults for all rows</p>

                <div className="flex items-center gap-3">
                  <span className="text-sm w-28 flex-shrink-0 text-muted-foreground">Card</span>
                  <Select value={defaultCardId} onValueChange={setDefaultCardId}>
                    <SelectTrigger className="h-9 text-sm flex-1">
                      <SelectValue placeholder="Select card (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>No card</SelectItem>
                      {cards.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{getCardName(c)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-sm w-28 flex-shrink-0 text-muted-foreground">Category *</span>
                  <Select value={defaultCategoryId} onValueChange={setDefaultCategoryId}>
                    <SelectTrigger className="h-9 text-sm flex-1">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.display_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Preview */}
              {preview.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground font-medium">Preview (first 5 rows)</p>
                  <div className="space-y-1.5">
                    {preview.map((row, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs bg-muted/20 rounded-lg px-3 py-2">
                        <span className="text-muted-foreground w-22 flex-shrink-0">{row.date}</span>
                        <span className="flex-1 truncate">{row.merchant || <span className="text-muted-foreground italic">no merchant</span>}</span>
                        <span className="font-medium flex-shrink-0">{row.amount}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!canProceed && (
                <div className="flex items-center gap-2 text-xs text-amber-500/80">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  Date, amount, and category are required to import.
                </div>
              )}
            </div>
          )}

          {/* Step 3: Done */}
          {step === "done" && (
            <div className="py-8 text-center">
              <CheckCircle2 className="w-14 h-14 mx-auto text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">Import complete!</h3>
              <p className="text-muted-foreground text-sm">
                {importCount} transaction{importCount !== 1 ? "s" : ""} imported successfully.
              </p>
            </div>
          )}

          <DialogFooter>
            {step === "map" && (
              <>
                <Button variant="outline" onClick={() => setStep("upload")}>Back</Button>
                <Button onClick={handleImport} disabled={!canProceed || importing}>
                  {importing ? "Importing..." : `Import ${rows.length} rows`}
                </Button>
              </>
            )}
            {step === "done" && (
              <Button onClick={() => { setOpen(false); reset(); }}>Done</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
