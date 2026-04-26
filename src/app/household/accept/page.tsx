"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

function HouseholdAcceptContent() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) return;
    setStatus("loading");
    fetch("/api/household/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setStatus("error");
          setMessage(data?.error ?? "Failed to accept invite");
          return;
        }
        setStatus("success");
      })
      .catch(() => {
        setStatus("error");
        setMessage("Failed to accept invite");
      });
  }, [token]);

  return (
    <div className="max-w-md mx-auto py-20 px-6 space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Household Invite</h1>
      {status === "loading" && <p className="text-sm text-muted-foreground">Accepting invite…</p>}
      {status === "success" && (
        <>
          <p className="text-sm text-muted-foreground">Invite accepted. You can now view the household in Settings.</p>
          <Button onClick={() => router.push("/settings")}>Go to Settings</Button>
        </>
      )}
      {status === "error" && <p className="text-sm text-destructive">{message}</p>}
      {status === "idle" && <p className="text-sm text-muted-foreground">Missing invite token.</p>}
    </div>
  );
}

export default function HouseholdAcceptPage() {
  return (
    <Suspense fallback={<div className="max-w-md mx-auto py-20 px-6 text-sm text-muted-foreground">Loading…</div>}>
      <HouseholdAcceptContent />
    </Suspense>
  );
}
