import Link from "next/link";
import { Bell, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function NotificationSettings(_: { userId: string }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Bell className="w-5 h-5 text-primary" />
            <h2 className="text-base font-semibold">Smart Alerts</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Manage your push, email, and SMS alert preferences.
          </p>
        </div>
        <Link href="/alerts" className="shrink-0">
          <Button variant="outline" size="sm" className="gap-1.5">
            Open Alerts Center
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
