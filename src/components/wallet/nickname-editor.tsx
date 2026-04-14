"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { UserCard } from "@/lib/types/database";
import { Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function NicknameEditor({
  card,
  onUpdated,
  className,
}: {
  card: UserCard;
  onUpdated: () => void;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(card.nickname ?? "");
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  async function save() {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("user_cards")
        .update({ nickname: value.trim() || null })
        .eq("id", card.id);
      if (error) throw error;
      toast.success("Nickname saved");
      setEditing(false);
      onUpdated();
    } catch {
      toast.error("Failed to save nickname");
    } finally {
      setSaving(false);
    }
  }

  function cancel() {
    setValue(card.nickname ?? "");
    setEditing(false);
  }

  if (editing) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <input
          type="text"
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") cancel();
          }}
          placeholder={card.card_template?.name ?? card.custom_name ?? "Nickname"}
          className="flex-1 min-w-0 h-9 rounded-lg border border-primary/40 bg-background px-3 text-sm text-foreground focus:outline-none focus:border-primary/70 transition-colors"
        />
        <button
          onClick={save}
          disabled={saving}
          className="h-9 w-9 flex items-center justify-center rounded-lg border border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10 transition-colors flex-shrink-0"
        >
          <Check className="w-4 h-4" />
        </button>
        <button
          onClick={cancel}
          className="h-9 w-9 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => { setValue(card.nickname ?? ""); setEditing(true); }}
      className={cn(
        "flex items-center gap-2 h-9 w-full px-3 rounded-lg border transition-colors text-sm text-left",
        card.nickname
          ? "border-border hover:border-primary/30 hover:bg-primary/[0.04]"
          : "border-dashed border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
        className
      )}
    >
      <Pencil className="w-3.5 h-3.5 flex-shrink-0 opacity-60" />
      <span className={card.nickname ? "font-medium" : "italic"}>
        {card.nickname || "Add nickname"}
      </span>
    </button>
  );
}
