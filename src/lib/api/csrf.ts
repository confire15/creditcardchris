import { NextRequest } from "next/server";

const ALLOWED_ORIGINS = [
  "https://creditcardchris.com",
  "https://www.creditcardchris.com",
];

if (process.env.NODE_ENV === "development") {
  ALLOWED_ORIGINS.push("http://localhost:3000");
}

function isAllowedDevelopmentOrigin(origin: string) {
  if (process.env.NODE_ENV !== "development") return false;
  try {
    const url = new URL(origin);
    return (url.hostname === "localhost" || url.hostname === "127.0.0.1") && (url.protocol === "http:" || url.protocol === "https:");
  } catch {
    return false;
  }
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
    return ALLOWED_ORIGINS.includes(origin) || isAllowedDevelopmentOrigin(origin);
  }

  const referer = req.headers.get("referer");
  if (referer) {
    try {
      const refUrl = new URL(referer);
      return ALLOWED_ORIGINS.some((o) => refUrl.origin === o) || isAllowedDevelopmentOrigin(refUrl.origin);
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
