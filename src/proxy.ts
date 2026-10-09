import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  // The preparedness site is public and needs no database session or authentication.
  const hostname = (
    request.headers.get("host")?.split(":")[0] ?? request.nextUrl.hostname
  ).toLowerCase();
  const preparednessHost = ["prepare.gocreditcardchris.com", "getready.creditcardchris.com", "gobag.creditcardchris.com"].includes(hostname);
  if (preparednessHost && ["/sitemap.xml", "/robots.txt"].includes(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = `/go-bag${url.pathname}`;
    return NextResponse.rewrite(url);
  }
  if (
    (hostname === "prepare.gocreditcardchris.com" ||
      hostname === "getready.creditcardchris.com" ||
      hostname === "gobag.creditcardchris.com") &&
    request.nextUrl.pathname === "/"
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/go-bag";
    return NextResponse.rewrite(url);
  }
  if (
    request.nextUrl.pathname === "/gobag-sw.js" ||
    request.nextUrl.pathname.startsWith("/gobag/") ||
    request.nextUrl.pathname === "/go-bag" ||
    request.nextUrl.pathname.startsWith("/go-bag/")
  ) {
    return NextResponse.next();
  }
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
