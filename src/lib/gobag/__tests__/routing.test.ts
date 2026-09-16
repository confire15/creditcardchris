import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
vi.mock("@/lib/supabase/middleware", () => ({
  updateSession: vi.fn(() => NextResponse.next()),
}));
import { updateSession } from "@/lib/supabase/middleware";
import { proxy } from "@/proxy";

describe("GoBag public routing", () => {
  beforeEach(() => vi.clearAllMocks());
  it("rewrites the go-bag hostname root without accessing auth", async () => {
    const response = await proxy(
      new NextRequest("https://gobag.creditcardchris.com/?source=test"),
    );
    expect(response.headers.get("x-middleware-rewrite")).toBe(
      "https://gobag.creditcardchris.com/go-bag?source=test",
    );
    expect(updateSession).not.toHaveBeenCalled();
  });
  it("honors the incoming Host when the runtime URL is normalized", async () => {
    const response = await proxy(
      new NextRequest("http://localhost:3100/", {
        headers: { host: "gobag.creditcardchris.com" },
      }),
    );
    expect(response.headers.get("x-middleware-rewrite")).toBe(
      "http://localhost:3100/go-bag",
    );
    expect(updateSession).not.toHaveBeenCalled();
  });
  it("serves the public development route without accessing auth", async () => {
    const response = await proxy(
      new NextRequest("http://localhost:3100/go-bag"),
    );
    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(updateSession).not.toHaveBeenCalled();
  });
  it.each([
    "https://creditcardchris.com/",
    "https://creditcardchris.com/wallet",
    "https://not-gobag.creditcardchris.com/",
  ])("preserves existing behavior for %s", async (url) => {
    await proxy(new NextRequest(url));
    expect(updateSession).toHaveBeenCalledOnce();
  });
});
