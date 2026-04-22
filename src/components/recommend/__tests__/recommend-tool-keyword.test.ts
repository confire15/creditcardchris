import { describe, expect, it } from "vitest";
import { resolveKeywordMatch } from "@/components/recommend/recommend-tool";

describe("resolveKeywordMatch", () => {
  it("maps shorthand aliases like TJ's to groceries", () => {
    expect(resolveKeywordMatch("TJ's")).toEqual({ categoryName: "groceries" });
  });

  it("returns a did-you-mean suggestion for partial fuzzy matches", () => {
    expect(resolveKeywordMatch("trdar jo")).toEqual({
      suggestion: {
        keyword: "trader joe",
        categoryName: "groceries",
      },
    });
  });

  it("returns no category for unknown merchants", () => {
    expect(resolveKeywordMatch("qzzyx merchant")).toEqual({});
  });
});
