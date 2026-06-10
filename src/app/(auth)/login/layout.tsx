import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign in | Credit Card Chris",
  description: "Sign in to Credit Card Chris with a magic link or Google — no password needed.",
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
