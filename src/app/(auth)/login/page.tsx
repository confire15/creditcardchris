"use client";

import Image from "next/image";
import { useState } from "react";
import Link from "next/link";
import { Loader2, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const hasSupabaseEnv = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();

    if (!hasSupabaseEnv) {
      setError("Login is temporarily unavailable. Missing Supabase configuration.");
      return;
    }

    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });

    if (error) {
      setError("We could not send a sign-in link. Please try again.");
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  }

  async function handleGoogleLogin() {
    if (!hasSupabaseEnv) {
      setError("Login is temporarily unavailable. Missing Supabase configuration.");
      return;
    }
    setGoogleLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setError("We couldn't connect to Google. Please try again.");
      setGoogleLoading(false);
    }
    // On success the browser redirects to Google, so keep the spinner going.
  }

  if (sent) {
    return (
      <div className="text-center space-y-6">
        <Link href="/" className="inline-block">
          <Image src="/logo.png" alt="Credit Card Chris" width={240} height={64} className="h-16 w-auto mx-auto" />
        </Link>
        <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
          <Mail className="w-7 h-7 text-primary" />
        </div>
        <div className="space-y-2">
          <h2 className="text-page-title">Check your email</h2>
          <p className="text-base leading-relaxed text-muted-foreground">
            We sent a magic link to <strong className="text-foreground">{email}</strong>. Click it to sign in.
          </p>
        </div>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            setSent(false);
            setError(null);
          }}
        >
          Send again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center space-y-5">
        <Link href="/" className="inline-block">
          <Image src="/logo.png" alt="Credit Card Chris" width={240} height={64} className="h-16 w-auto mx-auto" />
        </Link>
        <h1 className="text-page-title">Welcome back</h1>
      </div>

      <div className="relative rounded-2xl bg-gradient-to-b from-white/[0.04] to-transparent p-px shadow-2xl shadow-primary/5">
        <div className="rounded-2xl bg-card border border-border p-8 space-y-6">
          <div className="space-y-2">
            <Button
              variant="outline"
              className="w-full"
              onClick={handleGoogleLogin}
              type="button"
              disabled={!hasSupabaseEnv || googleLoading}
            >
              {googleLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              )}
              {googleLoading ? "Connecting to Google..." : "Continue with Google"}
            </Button>
            <p className="text-center text-xs text-muted-foreground">Fastest — one tap</p>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center mx-8">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase tracking-wider">
              <span className="bg-card px-3 text-muted-foreground">or</span>
            </div>
          </div>

          <form onSubmit={handleMagicLink} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="font-medium">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="pl-10"
                />
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="space-y-2">
              <Button type="submit" className="w-full" disabled={loading || !hasSupabaseEnv}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send magic link"
                )}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                No password needed. We&apos;ll email you a secure link.
              </p>
            </div>
          </form>
        </div>
      </div>

      <p className="text-center text-sm leading-relaxed text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="text-primary hover:underline font-medium">
          Sign up
        </Link>
      </p>
    </div>
  );
}
