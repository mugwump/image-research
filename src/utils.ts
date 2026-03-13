import type { SearchResult } from "./types";

export function buildCaptionText(result: SearchResult): string {
  const parts: string[] = [];

  parts.push(result.title);

  if (result.caption) {
    parts.push(result.caption);
  }

  if (result.datePublished) {
    parts.push(`Date: ${result.datePublished}`);
  }

  parts.push(`Source: ${result.source}`);
  parts.push(`URL: ${result.contextLink}`);

  return parts.join("\n");
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function downloadImage(imageUrl: string, title: string): void {
  const params = new URLSearchParams({ url: imageUrl });
  const link = document.createElement("a");
  link.href = `/api/download?${params}`;
  link.download = sanitizeFilename(title);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_\-. ]/g, "_").slice(0, 100);
}
