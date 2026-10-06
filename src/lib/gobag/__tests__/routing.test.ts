import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
vi.mock("@/lib/supabase/middleware", () => ({
  updateSession: vi.fn(() => NextResponse.next()),
}));
import { updateSession } from "@/lib/supabase/middleware";
import { proxy } from "@/proxy";

describe("GoBag public routing", () => {
  beforeEach(() => vi.clearAllMocks());
  it.each(["getready.creditcardchris.com", "gobag.creditcardchris.com"])(
    "rewrites the public hostname root without accessing auth: %s",
    async (host) => {
      const response = await proxy(
        new NextRequest(`https://${host}/?source=test`),
      );
      expect(response.headers.get("x-middleware-rewrite")).toBe(
        `https://${host}/go-bag?source=test`,
      );
      expect(updateSession).not.toHaveBeenCalled();
    },
  );
  it("honors the incoming Host when the runtime URL is normalized", async () => {
    const response = await proxy(
      new NextRequest("http://localhost:3100/", {
        headers: { host: "getready.creditcardchris.com" },
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
  it.each(["/gobag-sw.js", "/gobag/manifest.webmanifest"])(
    "keeps offline assets public: %s",
    async (path) => {
      await proxy(
        new NextRequest(`https://getready.creditcardchris.com${path}`),
      );
      expect(updateSession).not.toHaveBeenCalled();
    },
  );
  it.each([
    "https://creditcardchris.com/",
    "https://creditcardchris.com/wallet",
    "https://not-gobag.creditcardchris.com/",
  ])("preserves existing behavior for %s", async (url) => {
    await proxy(new NextRequest(url));
    expect(updateSession).toHaveBeenCalledOnce();
  });
});
