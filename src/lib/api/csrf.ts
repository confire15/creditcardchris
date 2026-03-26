import { NextRequest } from "next/server";

const ALLOWED_ORIGINS = [
  "https://creditcardchris.com",
  "https://www.creditcardchris.com",
];

if (process.env.NODE_ENV === "development") {
  ALLOWED_ORIGINS.push("http://localhost:3000");
}

export function validateOrigin(req: NextRequest): boolean {
  if (
    req.method === "GET" ||
    req.method === "HEAD" ||
    req.method === "OPTIONS"
  ) {
    return true;
  }

  const origin = req.headers.get("origin");
  if (origin) {
    return ALLOWED_ORIGINS.includes(origin);
  }

  const referer = req.headers.get("referer");
  if (referer) {
    try {
      const refUrl = new URL(referer);
      return ALLOWED_ORIGINS.some((o) => refUrl.origin === o);
    } catch {
      return false;
    }
  }

  // Native mobile clients (iOS/Android) don't send Origin or Referer.
  // Requests are still protected by the JWT auth check in withAuth/withPremium.
  const userAgent = req.headers.get("user-agent") ?? "";
  const isMobileApp =
    userAgent.includes("Expo") ||
    userAgent.includes("okhttp") ||
    userAgent.includes("CFNetwork");
  if (isMobileApp) return true;

  return false;
}
