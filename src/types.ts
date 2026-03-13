export interface SearchResult {
  title: string;
  thumbnail: string;
  thumbnailWidth: number;
  thumbnailHeight: number;
  fullImage: string;
  caption: string;
  source: string;
  contextLink: string;
  datePublished: string | null;
}

export interface SearchResponse {
  results: SearchResult[];
  totalResults: string;
  nextStart: number | null;
}

export interface ResearchMetadata {
  photographer: string | null;
  caption: string | null;
  datePublished: string | null;
  dateTaken: string | null;
  location: string | null;
  copyright: string | null;
  pageUrl: string;
}
