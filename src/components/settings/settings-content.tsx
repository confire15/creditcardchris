"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { LogOut, Mail, Shield, Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

export function SettingsContent({ user }: { user: User }) {
  const router = useRouter();
  const supabase = createClient();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
    router.push("/");
  }

  const displayName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split("@")[0] ||
    "User";

  const avatarUrl = user.user_metadata?.avatar_url;
  const provider = user.app_metadata?.provider;

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
        <div className="bg-card border border-white/[0.06] rounded-2xl p-6">
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
            <div className="mt-5 pt-5 border-t border-white/[0.06]">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Shield className="w-4 h-4" />
                <span>Signed in with {provider === "google" ? "Google" : provider}</span>
              </div>
            </div>
          )}
        </div>

        {/* App Info */}
        <div className="bg-card border border-white/[0.06] rounded-2xl p-6">
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
              <span className="font-medium">59 templates</span>
            </div>
          </div>
        </div>

        {/* Export Data */}
        <div className="bg-card border border-white/[0.06] rounded-2xl p-6">
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
