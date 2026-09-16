import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
const source = readFileSync("public/gobag-sw.js", "utf8");
describe("offline cache boundaries", () => {
  it("never intercepts APIs, authenticated routes, external links, or mutations", () => {
    const handlers: Record<string, (event: unknown) => void> = {};
    runInNewContext(source, {
      URL,
      Response,
      self: {
        location: { origin: "https://gobag.creditcardchris.com" },
        addEventListener: (name: string, fn: (event: unknown) => void) => {
          handlers[name] = fn;
        },
      },
    });
    for (const [path, method, mode] of [
      ["/api/actions", "GET", "cors"],
      ["/wallet", "GET", "navigate"],
      ["https://amazon.com/s?k=water", "GET", "navigate"],
      ["/go-bag", "POST", "navigate"],
      ["/go-bag?_rsc=test", "GET", "cors"],
    ]) {
      const respondWith = vi.fn();
      handlers.fetch({
        request: {
          url: new URL(path, "https://gobag.creditcardchris.com").href,
          method,
          mode,
        },
        respondWith,
      });
      expect(respondWith).not.toHaveBeenCalled();
    }
  });
  it("serves the saved public checklist after an offline fresh navigation", async () => {
    const handlers: Record<string, (event: unknown) => void> = {};
    const match = vi.fn().mockResolvedValue(new Response("cached checklist"));
    runInNewContext(source, {
      URL,
      Response,
      fetch: vi.fn().mockRejectedValue(new Error("offline")),
      caches: { match },
      self: {
        location: { origin: "https://gobag.creditcardchris.com" },
        addEventListener: (name: string, fn: (event: unknown) => void) => {
          handlers[name] = fn;
        },
      },
    });
    let result: Promise<Response> | undefined;
    handlers.fetch({
      request: {
        url: "https://gobag.creditcardchris.com/",
        method: "GET",
        mode: "navigate",
      },
      respondWith: (r: Promise<Response>) => {
        result = r;
      },
    });
    expect(await (await result!).text()).toBe("cached checklist");
    expect(match).toHaveBeenCalledWith(
      "https://gobag.creditcardchris.com/go-bag",
      { cacheName: "gobag-offline-v1" },
    );
  });
});
