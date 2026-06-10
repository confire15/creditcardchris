"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Bell link to the Alerts hub with an upcoming-alert count badge.
 * Count comes from /api/alerts/count, which shares its source of truth
 * with the /alerts page (buildUpcomingAlerts).
 */
export function AlertsBell({ className, iconClassName }: { className?: string; iconClassName?: string }) {
  const pathname = usePathname();
  const [count, setCount] = useState(0);

  useEffect(() => {
    let active = true;
    fetch("/api/alerts/count", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data && typeof data.count === "number") setCount(data.count);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [pathname]);

  const isActive = pathname === "/alerts" || pathname.startsWith("/alerts/");

  return (
    <Link
      href="/alerts"
      aria-label={count > 0 ? `Alerts (${count} upcoming)` : "Alerts"}
      title="Alerts"
      className={cn(
        "relative rounded-full p-2 transition-all",
        isActive
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:text-foreground hover:bg-overlay-hover",
        className
      )}
    >
      <Bell className={cn("w-4 h-4", iconClassName)} />
      {count > 0 && (
        <span
          aria-hidden
          className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold leading-none text-primary-foreground ring-2 ring-background"
        >
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}
