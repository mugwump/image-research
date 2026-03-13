import { describe, it, expect } from "vitest";
import { buildCaptionText } from "../src/utils";
import type { SearchResult } from "../src/types";

function makeResult(overrides: Partial<SearchResult> = {}): SearchResult {
  return {
    title: "Test Image",
    thumbnail: "https://example.com/thumb.jpg",
    thumbnailWidth: 150,
    thumbnailHeight: 150,
    fullImage: "https://example.com/full.jpg",
    caption: "A test image caption",
    source: "example.com",
    contextLink: "https://example.com/page",
    datePublished: null,
    ...overrides,
  };
}

describe("buildCaptionText", () => {
  it("includes title, caption, source, and URL", () => {
    const text = buildCaptionText(makeResult());

    expect(text).toContain("Test Image");
    expect(text).toContain("A test image caption");
    expect(text).toContain("Source: example.com");
    expect(text).toContain("URL: https://example.com/page");
  });

  it("includes date when available", () => {
    const text = buildCaptionText(
      makeResult({ datePublished: "January 1, 2025" })
    );

    expect(text).toContain("Date: January 1, 2025");
  });

  it("omits date line when datePublished is null", () => {
    const text = buildCaptionText(makeResult({ datePublished: null }));

    expect(text).not.toContain("Date:");
  });

  it("omits caption line when caption is empty", () => {
    const text = buildCaptionText(makeResult({ caption: "" }));
    const lines = text.split("\n");

    // Should be: title, source, URL (3 lines)
    expect(lines).toHaveLength(3);
  });
});
