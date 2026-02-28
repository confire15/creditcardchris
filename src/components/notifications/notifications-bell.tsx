"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Bell, AlertTriangle, Star, CreditCard } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type Notification = {
  id: string;
  type: "expiring_points" | "statement_credit" | "goal_progress" | "goal_complete";
  title: string;
  description: string;
  urgency: "high" | "medium" | "low";
};

export function NotificationsBell({ userId }: { userId: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const supabase = createClient();

  const fetchNotifications = useCallback(async () => {
    const now = new Date();
    const items: Notification[] = [];

    // 1. Points expiring soon (within 60 days)
    const { data: cards } = await supabase
      .from("user_cards")
      .select("id, points_expiration_date, nickname, custom_name, card_template:card_templates(name)")
      .eq("user_id", userId)
      .eq("is_active", true)
      .not("points_expiration_date", "is", null);

    (cards ?? []).forEach((card) => {
      if (!card.points_expiration_date) return;
      const expDate = new Date(card.points_expiration_date);
      const daysUntil = Math.ceil(
        (expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysUntil <= 60 && daysUntil >= 0) {
        const template = Array.isArray(card.card_template) ? null : card.card_template as { name: string } | null;
        const cardName =
          card.nickname ?? template?.name ?? card.custom_name ?? "Card";
        items.push({
          id: `exp-${card.id}`,
          type: "expiring_points",
          title: "Points expiring soon",
          description: `${cardName} points expire in ${daysUntil} day${daysUntil !== 1 ? "s" : ""}`,
          urgency: daysUntil <= 14 ? "high" : "medium",
        });
      }
    });

    // 2. Statement credits expiring this month
    const currentMonth = now.getMonth() + 1;
    const { data: credits } = await supabase
      .from("statement_credits")
      .select("id, name, annual_amount, used_amount, reset_month")
      .eq("user_id", userId)
      .eq("reset_month", currentMonth);

    (credits ?? []).forEach((credit) => {
      const remaining = credit.annual_amount - credit.used_amount;
      if (remaining > 0) {
        items.push({
          id: `credit-${credit.id}`,
          type: "statement_credit",
          title: "Statement credit expiring",
          description: `$${remaining.toFixed(0)} remaining on "${credit.name}" — resets end of month`,
          urgency: "medium",
        });
      }
    });

    // 3. Goals near completion or complete
    const { data: goals } = await supabase
      .from("rewards_goals")
      .select("id, name, target_points, is_active")
      .eq("user_id", userId)
      .eq("is_active", true);

    if (goals && goals.length > 0) {
      const { data: txData } = await supabase
        .from("transactions")
        .select("rewards_earned")
        .eq("user_id", userId);

      const totalRewards = (txData ?? []).reduce(
        (sum, t) => sum + (t.rewards_earned ?? 0),
        0
      );

      goals.forEach((goal) => {
        const progress = Math.min(totalRewards / goal.target_points, 1);
        if (progress >= 1) {
          items.push({
            id: `goal-complete-${goal.id}`,
            type: "goal_complete",
            title: "Goal reached!",
            description: `"${goal.name}" has been achieved`,
            urgency: "low",
          });
        } else if (progress >= 0.8) {
          const remaining = goal.target_points - Math.round(totalRewards);
          items.push({
            id: `goal-${goal.id}`,
            type: "goal_progress",
            title: "Goal almost there",
            description: `"${goal.name}" is ${Math.round(progress * 100)}% complete — ${remaining.toLocaleString()} pts to go`,
            urgency: "low",
          });
        }
      });
    }

    // Sort by urgency
    const urgencyOrder = { high: 0, medium: 1, low: 2 };
    items.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);
    setNotifications(items);
  }, [userId, supabase]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const count = notifications.length;

  const NotifIcon = {
    expiring_points: CreditCard,
    statement_credit: AlertTriangle,
    goal_progress: Star,
    goal_complete: Star,
  };

  const borderColor = {
    high: "border-l-red-500",
    medium: "border-l-amber-500",
    low: "border-l-emerald-500",
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="relative p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition-all">
          <Bell className="w-5 h-5" />
          {count > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center">
              {count > 9 ? "9+" : count}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-4 border-b border-white/[0.06]">
          <p className="font-semibold text-sm">Notifications</p>
          {count === 0 && (
            <p className="text-xs text-muted-foreground mt-0.5">
              You&apos;re all caught up
            </p>
          )}
        </div>

        {count > 0 ? (
          <div className="divide-y divide-white/[0.06] max-h-80 overflow-y-auto">
            {notifications.map((n) => {
              const Icon = NotifIcon[n.type];
              return (
                <div
                  key={n.id}
                  className={cn(
                    "flex gap-3 p-4 border-l-2",
                    borderColor[n.urgency]
                  )}
                >
                  <Icon className="w-4 h-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{n.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      {n.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground text-sm">
            <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
            No alerts right now
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
