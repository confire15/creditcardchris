"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { LogOut, Mail, Shield, Trash2, Sun, Moon, MessageSquare, ExternalLink, Calculator, ChevronRight, BarChart2, MessageCircle } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { useTheme } from "next-themes";
import { NotificationSettings } from "./notification-settings";
import { SubscriptionCard } from "./subscription-card";
import { Suspense } from "react";

export function SettingsContent({ user }: { user: User; isPremium: boolean }) {
  const router = useRouter();
  const supabase = createClient();
  const [signingOut, setSigningOut] = useState(false);
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

  return (
    <div>
      <PageHeader className="mb-10" title="Settings" description="Manage your account and preferences" />

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

        {/* Tools */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2">
            <h2 className="text-base font-semibold">Tools</h2>
          </div>
          <div className="divide-y divide-border">
            <Link
              href="/calculator"
              className="flex items-center justify-between px-4 sm:px-6 py-4 hover:bg-muted/40 transition-colors"
            >
              <div className="flex items-center gap-3 text-sm">
                <Calculator className="w-4 h-4 text-muted-foreground" />
                <span>Fee Calculator</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
            </Link>
            <Link
              href="/recap"
              className="flex items-center justify-between px-4 sm:px-6 py-4 hover:bg-muted/40 transition-colors"
            >
              <div className="flex items-center gap-3 text-sm">
                <BarChart2 className="w-4 h-4 text-muted-foreground" />
                <div>
                  <span>Year Recap</span>
                  <span className="ml-2 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">Premium</span>
                </div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
            </Link>
            <Link
              href="/feedback"
              className="flex items-center justify-between px-4 sm:px-6 py-4 hover:bg-muted/40 transition-colors"
            >
              <div className="flex items-center gap-3 text-sm">
                <MessageCircle className="w-4 h-4 text-muted-foreground" />
                <span>Share Feedback</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
            </Link>
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
        <div id="subscription" className="scroll-mt-24">
          <Suspense fallback={<div className="h-40 bg-muted animate-pulse rounded-2xl" />}>
            <SubscriptionCard userId={user.id} />
          </Suspense>
        </div>

        {/* Smart Alerts */}
        <div id="alerts" className="scroll-mt-24">
          <Suspense fallback={<div className="h-28 bg-muted animate-pulse rounded-2xl" />}>
            <NotificationSettings userId={user.id} />
          </Suspense>
        </div>

        <Separator />

        {/* Danger Zone */}
        <div>
          <h2 className="text-base font-semibold mb-1 text-destructive">Danger Zone</h2>
          <p className="text-sm text-muted-foreground mb-5">
            These actions are permanent and cannot be undone.
          </p>
          <div className="space-y-3">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  className="gap-2 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Account
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Account deletion is handled by a human so nothing is removed by
                    mistake. Continuing opens a pre-written email to
                    chris@creditcardchris.com — send it and your account and data
                    will be permanently deleted.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep my account</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      window.location.href = `mailto:chris@creditcardchris.com?subject=Delete%20My%20Account&body=Please%20delete%20my%20account%20(${encodeURIComponent(user.email ?? "")}).`;
                    }}
                  >
                    Open email
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
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
