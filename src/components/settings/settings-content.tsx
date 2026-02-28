"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { LogOut, Mail, Shield, Download, Trash2, Share2, Copy, Check, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import { SpendingBudgets } from "./spending-budgets";
import { PushNotificationsToggle } from "./push-notifications-toggle";

export function SettingsContent({ user }: { user: User }) {
  const router = useRouter();
  const supabase = createClient();
  const [signingOut, setSigningOut] = useState(false);
  const { theme, setTheme } = useTheme();
  const [copied, setCopied] = useState(false);
  const displayName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split("@")[0] ||
    "User";

  const avatarUrl = user.user_metadata?.avatar_url;
  const provider = user.app_metadata?.provider;

  // Generate a stable referral code from the user's id (first 8 chars, uppercase)
  const referralCode = user.id.replace(/-/g, "").slice(0, 8).toUpperCase();
  const referralUrl = `https://creditcardchris.com/signup?ref=${referralCode}`;

  // Upsert public profile on settings page load
  useEffect(() => {
    supabase
      .from("public_profiles")
      .upsert(
        {
          user_id: user.id,
          referral_code: referralCode,
          display_name: displayName,
          member_since: user.created_at,
        },
        { onConflict: "user_id", ignoreDuplicates: false }
      )
      .then(() => {});
  }, [user.id, referralCode, displayName, user.created_at, supabase]);

  async function copyReferralLink() {
    await navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSignOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
    router.push("/");
  }

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
        <div className="bg-card border border-border rounded-2xl p-6">
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

        {/* App Info */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <h2 className="text-base font-semibold mb-5">About</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">App</span>
              <span className="font-medium">Credit Card Chris</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Version</span>
              <span className="font-medium">1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cards supported</span>
              <span className="font-medium">59 cards</span>
            </div>
          </div>
        </div>

        {/* Appearance */}
        <div className="bg-card border border-border rounded-2xl p-6">
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

        {/* Push Notifications */}
        <PushNotificationsToggle />

        {/* Monthly Budgets */}
        <SpendingBudgets userId={user.id} />

        {/* Export Data */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <h2 className="text-base font-semibold mb-1">Your Data</h2>
          <p className="text-sm text-muted-foreground mb-5">
            Export your transaction history as a CSV file.
          </p>
          <Button
            variant="outline"
            onClick={() => router.push("/transactions")}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            Export from Transactions page
          </Button>
        </div>

        {/* Refer a friend */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-1">
            <Share2 className="w-4 h-4 text-primary" />
            <h2 className="text-base font-semibold">Refer a Friend</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-5">
            Share Credit Card Chris with friends and help them maximize their rewards.
          </p>
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0 bg-muted/30 border border-border rounded-xl px-3 py-2">
              <p className="text-sm font-mono text-muted-foreground truncate">{referralUrl}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={copyReferralLink}
              className="gap-1.5 flex-shrink-0"
            >
              {copied ? (
                <><Check className="w-4 h-4 text-emerald-400" /> Copied!</>
              ) : (
                <><Copy className="w-4 h-4" /> Copy</>
              )}
            </Button>
          </div>
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
              onClick={() => toast.error("Contact chris@creditcardchris.com to delete your account.")}
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
