import { toast } from "sonner";

export async function goPremium(opts?: { successPath?: string; cancelPath?: string }) {
  try {
    const res = await fetch("/api/stripe/create-checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(opts ?? {}),
    });
    const data = await res.json().catch(() => ({}));
    if (data?.url) {
      window.location.href = data.url;
      return;
    }
    toast.error(data?.error ?? "Failed to start checkout");
  } catch {
    toast.error("Something went wrong");
  }
}
