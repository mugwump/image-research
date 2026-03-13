import type { SearchResponse, ResearchMetadata } from "./types";

export async function searchImages(
  query: string,
  offset = 0
): Promise<SearchResponse> {
  const params = new URLSearchParams({ q: query, offset: String(offset) });
  const response = await fetch(`/api/search?${params}`);

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(
      (body as { error?: string }).error ?? `Search failed (${response.status})`
    );
  }

  return response.json();
}

export async function researchImage(
  sourceUrl: string
): Promise<ResearchMetadata> {
  const params = new URLSearchParams({ url: sourceUrl });
  const response = await fetch(`/api/research?${params}`);

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(
      (body as { error?: string }).error ?? `Research failed (${response.status})`
    );
  }

  return response.json();
}
