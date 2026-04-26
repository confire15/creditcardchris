"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { LogOut, Mail, Shield, Trash2, Sun, Moon, MessageSquare, ExternalLink, Download, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import { NotificationSettings } from "./notification-settings";
import { SubscriptionCard } from "./subscription-card";
import { Suspense } from "react";
import { SpendingCategory } from "@/lib/types/database";
import { Input } from "@/components/ui/input";
import { goPremium } from "@/lib/utils/upgrade";

export function SettingsContent({ user, isPremium }: { user: User; isPremium: boolean }) {
  const router = useRouter();
  const supabase = createClient();
  const [signingOut, setSigningOut] = useState(false);
  const [customCategories, setCustomCategories] = useState<SpendingCategory[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [newIcon, setNewIcon] = useState("");
  const [household, setHousehold] = useState<{ id: string; is_owner: boolean; role: string } | null>(null);
  const [members, setMembers] = useState<Array<{ id: string; user_id: string; role: string; accepted_at: string | null }>>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const { theme, setTheme } = useTheme();
  const displayName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split("@")[0] ||
    "User";

  const avatarUrl = user.user_metadata?.avatar_url;
  const provider = user.app_metadata?.provider;

  async function handleSignOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
    router.push("/");
  }

  useEffect(() => {
    fetch("/api/custom-categories")
      .then((res) => res.json())
      .then((data) =>
        setCustomCategories(((data?.categories ?? []) as SpendingCategory[]).filter((category) => category.user_id)),
      )
      .catch(() => {});

    fetch("/api/household/members")
      .then((res) => res.json())
      .then((data) => {
        setHousehold(data?.household ?? null);
        setMembers(data?.members ?? []);
      })
      .catch(() => {});
  }, []);

  const addCustomCategory = async () => {
    const res = await fetch("/api/custom-categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newCategory, icon: newIcon }),
    });
    if (res.status === 403) {
      await goPremium({ successPath: "/settings", cancelPath: "/settings" });
      return;
    }
    const data = await res.json().catch(() => ({}));
    if (res.ok && data?.category) {
      setCustomCategories((prev) => [...prev, data.category]);
      setNewCategory("");
      setNewIcon("");
    }
  };

  const deleteCategory = async (id: string) => {
    const res = await fetch(`/api/custom-categories/${id}`, { method: "DELETE" });
    if (res.ok) {
      setCustomCategories((prev) => prev.filter((category) => category.id !== id));
    }
  };

  const sendInvite = async () => {
    const res = await fetch("/api/household/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail }),
    });
    if (res.ok) {
      setInviteEmail("");
      const data = await res.json().catch(() => ({}));
      if (data?.inviteUrl) window.open(data.inviteUrl, "_blank", "noopener,noreferrer");
    }
  };

  const removeMember = async (memberId: string) => {
    const res = await fetch("/api/household/members", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId }),
    });
    if (res.ok) {
      setMembers((prev) => prev.filter((member) => member.id !== memberId));
    }
  };

  return (
    <div>
      <div className="mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-base mt-2">
          Manage your account and preferences
        </p>
      </div>

      <div className="max-w-2xl space-y-8">
        {/* Profile */}
        <div className="bg-card border border-border rounded-2xl p-4 sm:p-6">
          <h2 className="text-base font-semibold mb-5">Profile</h2>
          <div className="flex items-center gap-4">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName}
                className="w-14 h-14 rounded-full object-cover"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg">
                {displayName[0].toUpperCase()}
              </div>
            )}
            <div>
              <p className="font-semibold text-lg">{displayName}</p>
              <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
                <Mail className="w-3.5 h-3.5" />
                {user.email}
              </p>
            </div>
          </div>

          {provider && (
            <div className="mt-5 pt-5 border-t border-border">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Shield className="w-4 h-4" />
                <span>Signed in with {provider === "google" ? "Google" : provider}</span>
              </div>
            </div>
          )}
        </div>

        {/* Help & Feedback */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2">
            <h2 className="text-base font-semibold">Help &amp; Feedback</h2>
          </div>
          <div className="divide-y divide-border">
            <a
              href="mailto:chris@creditcardchris.com?subject=Feedback%20for%20Credit%20Card%20Chris"
              className="flex items-center justify-between px-4 sm:px-6 py-4 hover:bg-muted/40 transition-colors"
            >
              <div className="flex items-center gap-3 text-sm">
                <MessageSquare className="w-4 h-4 text-muted-foreground" />
                <span>Send feedback</span>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
            </a>
            <a
              href="mailto:chris@creditcardchris.com?subject=Bug%20Report%20-%20Credit%20Card%20Chris"
              className="flex items-center justify-between px-4 sm:px-6 py-4 hover:bg-muted/40 transition-colors"
            >
              <div className="flex items-center gap-3 text-sm">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span>Report a bug</span>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
            </a>
          </div>
          <div className="px-4 sm:px-6 pb-4 pt-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>Credit Card Chris v1.0</span>
            <span>creditcardchris.com</span>
          </div>
        </div>

        {/* Appearance */}
        <div className="bg-card border border-border rounded-2xl p-4 sm:p-6">
          <h2 className="text-base font-semibold mb-5">Appearance</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Theme</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                {theme === "dark" ? "Dark mode" : "Light mode"}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="gap-2"
            >
              {theme === "dark" ? (
                <><Sun className="w-4 h-4" /> Switch to Light</>
              ) : (
                <><Moon className="w-4 h-4" /> Switch to Dark</>
              )}
            </Button>
          </div>
        </div>

        {/* Subscription */}
        <Suspense fallback={<div className="h-40 bg-muted animate-pulse rounded-2xl" />}>
          <SubscriptionCard userId={user.id} />
        </Suspense>

        <div className="bg-card border border-border rounded-2xl p-4 sm:p-6 space-y-4">
          <div>
            <h2 className="text-base font-semibold">Export Data</h2>
            <p className="text-sm text-muted-foreground mt-1">Download your wallet data and activity history.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => { window.location.href = "/api/export/wallet?format=csv"; }}>
              <Download className="w-4 h-4 mr-2" />
              Export wallet (CSV)
            </Button>
            <Button variant="outline" onClick={() => { window.location.href = "/api/export/all?format=json"; }}>
              <Download className="w-4 h-4 mr-2" />
              Export everything (JSON)
            </Button>
            <Button variant="ghost" onClick={() => router.push("/settings/activity")}>
              <History className="w-4 h-4 mr-2" />
              View activity log
            </Button>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 sm:p-6 space-y-4">
          <div>
            <h2 className="text-base font-semibold">Custom Categories</h2>
            <p className="text-sm text-muted-foreground mt-1">Create user-defined spend categories.</p>
          </div>
          {!isPremium ? (
            <div className="rounded-xl border border-primary/30 bg-primary/[0.06] p-4">
              <p className="text-sm font-medium">Create custom categories with Premium</p>
              <Button className="mt-3" onClick={() => goPremium({ successPath: "/settings", cancelPath: "/settings" })}>
                Upgrade for $3.99/mo
              </Button>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                {customCategories.map((category) => (
                  <div key={category.id} className="inline-flex items-center gap-2 rounded-full border border-overlay-subtle bg-muted/40 px-3 py-1 text-sm">
                    <span>{category.display_name}</span>
                    <span className="text-[10px] text-primary uppercase">Custom</span>
                    <button onClick={() => deleteCategory(category.id)} className="text-muted-foreground hover:text-destructive">×</button>
                  </div>
                ))}
              </div>
              <div className="grid sm:grid-cols-3 gap-2">
                <Input placeholder="Category name" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} />
                <Input placeholder="Icon (optional)" value={newIcon} onChange={(e) => setNewIcon(e.target.value)} />
                <Button onClick={addCustomCategory}>Add category</Button>
              </div>
            </>
          )}
        </div>

        {/* Smart Alerts */}
        <Suspense fallback={<div className="h-28 bg-muted animate-pulse rounded-2xl" />}>
          <NotificationSettings userId={user.id} />
        </Suspense>

        <div className="bg-card border border-border rounded-2xl p-4 sm:p-6 space-y-4">
          <div>
            <h2 className="text-base font-semibold">Household</h2>
            <p className="text-sm text-muted-foreground mt-1">Invite a partner to view your shared household wallet.</p>
          </div>
          {household?.is_owner ? (
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input placeholder="partner@email.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
                <Button onClick={sendInvite}>Invite</Button>
              </div>
              <div className="space-y-2">
                {members.map((member) => (
                  <div key={member.id} className="flex items-center justify-between rounded-lg border border-overlay-subtle px-3 py-2 text-sm">
                    <span>{member.user_id.slice(0, 8)}… · {member.role}</span>
                    {member.role !== "owner" && (
                      <Button variant="ghost" size="sm" onClick={() => removeMember(member.id)}>Remove</Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {household ? "You are part of a household." : "No household yet. Upgrade to Premium to invite a partner."}
            </p>
          )}
        </div>

        <Separator />

        {/* Danger Zone */}
        <div>
          <h2 className="text-base font-semibold mb-1 text-destructive">Danger Zone</h2>
          <p className="text-sm text-muted-foreground mb-5">
            These actions are permanent and cannot be undone.
          </p>
          <div className="space-y-3">
            <Button
              variant="outline"
              className="gap-2 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => {
                window.location.href = `mailto:chris@creditcardchris.com?subject=Delete%20My%20Account&body=Please%20delete%20my%20account%20(${encodeURIComponent(user.email ?? "")}).`;
              }}
            >
              <Trash2 className="w-4 h-4" />
              Delete Account
            </Button>
          </div>
        </div>

        <Separator />

        {/* Sign out */}
        <Button
          variant="outline"
          onClick={handleSignOut}
          disabled={signingOut}
          className="gap-2 w-full sm:w-auto"
        >
          <LogOut className="w-4 h-4" />
          {signingOut ? "Signing out..." : "Sign Out"}
        </Button>
      </div>
    </div>
  );
}
