import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  // GoBag is public and needs no database session or authentication.
  const hostname = (
    request.headers.get("host")?.split(":")[0] ?? request.nextUrl.hostname
  ).toLowerCase();
  if (
    hostname === "gobag.creditcardchris.com" &&
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
