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

  return false;
}
