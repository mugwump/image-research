import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ImageTile } from "../src/components/ImageTile";
import type { SearchResult } from "../src/types";

function makeResult(overrides: Partial<SearchResult> = {}): SearchResult {
  return {
    title: "Sunset Over Mountains",
    thumbnail: "https://example.com/thumb.jpg",
    thumbnailWidth: 200,
    thumbnailHeight: 150,
    fullImage: "https://example.com/full.jpg",
    caption: "Beautiful sunset captured in the Alps",
    source: "photography.com",
    contextLink: "https://photography.com/sunset",
    datePublished: "March 10, 2025",
    ...overrides,
  };
}

describe("ImageTile", () => {
  it("renders the title", () => {
    render(<ImageTile result={makeResult()} />);
    expect(screen.getByText("Sunset Over Mountains")).toBeDefined();
  });

  it("renders the caption", () => {
    render(<ImageTile result={makeResult()} />);
    expect(
      screen.getByText("Beautiful sunset captured in the Alps")
    ).toBeDefined();
  });

  it("renders date when available", () => {
    render(<ImageTile result={makeResult()} />);
    expect(screen.getByText("March 10, 2025")).toBeDefined();
  });

  it("does not render date when null", () => {
    render(<ImageTile result={makeResult({ datePublished: null })} />);
    expect(screen.queryByText("March 10, 2025")).toBeNull();
  });

  it("renders the source domain", () => {
    render(<ImageTile result={makeResult()} />);
    expect(screen.getByText("photography.com")).toBeDefined();
  });

  it("renders download and copy buttons", () => {
    render(<ImageTile result={makeResult()} />);
    expect(screen.getByTitle("Download hi-res image")).toBeDefined();
    expect(
      screen.getByTitle("Copy caption and source to clipboard")
    ).toBeDefined();
  });

  it("links thumbnail to the context page", () => {
    render(<ImageTile result={makeResult()} />);
    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toBe("https://photography.com/sunset");
    expect(link.getAttribute("target")).toBe("_blank");
  });
});
