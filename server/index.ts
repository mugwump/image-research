import "dotenv/config";
import express from "express";

const app = express();
const PORT = 3001;

const BRAVE_API_KEY = process.env.BRAVE_API_KEY;

if (!BRAVE_API_KEY) {
  console.error(
    "Missing BRAVE_API_KEY in .env — copy .env.example to .env and fill in your credentials."
  );
  process.exit(1);
}

const BRAVE_ENDPOINT = "https://api.search.brave.com/res/v1/images/search";

interface BraveThumbnail {
  src?: string;
  width?: number;
  height?: number;
}

interface BraveImageProperties {
  url?: string;
  width?: number;
  height?: number;
  placeholder?: string;
}

interface BraveImageResult {
  title?: string;
  url?: string;
  source?: string;
  thumbnail?: BraveThumbnail;
  properties?: BraveImageProperties;
  description?: string;
}

interface BraveImageSearchResponse {
  results?: BraveImageResult[];
  query?: {
    original?: string;
    altered?: string;
  };
}

// Search endpoint
app.get("/api/search", async (req, res) => {
  const query = req.query.q as string;
  const offset = parseInt((req.query.offset as string) || "0", 10);

  if (!query) {
    res.status(400).json({ error: "Missing query parameter 'q'" });
    return;
  }

  try {
    const url = new URL(BRAVE_ENDPOINT);
    url.searchParams.set("q", query);
    url.searchParams.set("count", "20");
    url.searchParams.set("offset", String(offset));
    url.searchParams.set("safesearch", "off");
    url.searchParams.set("spellcheck", "1");

    const response = await fetch(url.toString(), {
      headers: {
        "X-Subscription-Token": BRAVE_API_KEY,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const body = await response.text();
      console.error("Brave API error:", response.status, body);
      res
        .status(response.status)
        .json({ error: "Brave API request failed", details: body });
      return;
    }

    const data = (await response.json()) as BraveImageSearchResponse;
    const items = data.results ?? [];

    // Only include results that have a high-res image available
    const results = items
      .filter((item) => item.properties?.url)
      .map((item) => {
        let source = item.source ?? "";
        if (!source && item.url) {
          try {
            source = new URL(item.url).hostname;
          } catch {
            // ignore
          }
        }

        return {
          title: item.title ?? "Untitled",
          thumbnail: item.thumbnail?.src ?? "",
          thumbnailWidth: item.thumbnail?.width ?? 500,
          thumbnailHeight: item.thumbnail?.height ?? 375,
          fullImage: item.properties!.url!,
          caption: item.description ?? "",
          source,
          contextLink: item.url ?? "",
          datePublished: null as string | null,
        };
      });

    // Brave returns up to 200 results; signal "more" if we got a full page
    const nextStart = items.length >= 20 ? offset + items.length : null;

    res.json({
      results,
      totalResults: String(items.length),
      nextStart,
    });
  } catch (err) {
    console.error("Search error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Research endpoint — fetches source page and extracts metadata
app.get("/api/research", async (req, res) => {
  const pageUrl = req.query.url as string;

  if (!pageUrl) {
    res.status(400).json({ error: "Missing query parameter 'url'" });
    return;
  }

  try {
    const response = await fetch(pageUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; ImageResearchBot/1.0; +http://localhost)",
        Accept: "text/html",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      res.status(502).json({ error: "Failed to fetch source page" });
      return;
    }

    const html = await response.text();
    const meta = extractPageMetadata(html, pageUrl);
    meta.pageUrl = pageUrl;

    res.json(meta);
  } catch (err) {
    console.error("Research error:", err);
    res.status(500).json({ error: "Failed to research image" });
  }
});

function extractMetaContent(html: string, nameOrProp: string): string | null {
  // Match <meta property="..." content="..."> or <meta name="..." content="...">
  const patterns = [
    new RegExp(
      `<meta[^>]+(?:property|name)=["']${escapeRegex(nameOrProp)}["'][^>]+content=["']([^"']*)["']`,
      "i"
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${escapeRegex(nameOrProp)}["']`,
      "i"
    ),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return decodeHtmlEntities(match[1].trim());
  }
  return null;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function formatMetaDate(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const d = new Date(raw);
    if (isNaN(d.getTime())) return raw; // return raw string if not parseable
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return raw;
  }
}

interface ImageWithCaption {
  url: string;
  caption: string | null;
}

interface PageMetadata {
  photographer: string | null;
  caption: string | null;
  datePublished: string | null;
  dateTaken: string | null;
  location: string | null;
  copyright: string | null;
  pageUrl: string;
  images: ImageWithCaption[];
}

const SKIP_PATTERNS = [
  /logo/i,
  /icon/i,
  /favicon/i,
  /avatar/i,
  /badge/i,
  /button/i,
  /sprite/i,
  /tracking/i,
  /pixel/i,
  /spacer/i,
  /banner-ad/i,
  /advertisement/i,
  /\bads?\b/i,
  /\.svg$/i,
  /data:image/i,
  /1x1/i,
  /blank\./i,
];

function extractCaptionFromImgTag(imgTag: string): string | null {
  // Try alt attribute
  const altMatch = imgTag.match(/alt=["']([^"']+)["']/i);
  if (altMatch?.[1]) {
    const alt = decodeHtmlEntities(altMatch[1].trim());
    // Skip generic/unhelpful alt text
    if (alt && alt.length > 3 && !/^(image|photo|img|picture|thumbnail|untitled)$/i.test(alt)) {
      return alt;
    }
  }
  // Try title attribute
  const titleMatch = imgTag.match(/title=["']([^"']+)["']/i);
  if (titleMatch?.[1]) {
    const title = decodeHtmlEntities(titleMatch[1].trim());
    if (title && title.length > 3) return title;
  }
  return null;
}

function extractFigcaption(html: string, imgSrc: string): string | null {
  // Find <figure> elements containing this image src and extract their <figcaption>
  const escapedSrc = imgSrc.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const figureRegex = new RegExp(
    `<figure[^>]*>[\\s\\S]*?${escapedSrc}[\\s\\S]*?</figure>`,
    "i"
  );
  const figureMatch = html.match(figureRegex);
  if (figureMatch) {
    const captionMatch = figureMatch[0].match(
      /<figcaption[^>]*>([\s\S]*?)<\/figcaption>/i
    );
    if (captionMatch?.[1]) {
      // Strip HTML tags from the figcaption content
      const text = captionMatch[1].replace(/<[^>]+>/g, "").trim();
      if (text) return decodeHtmlEntities(text);
    }
  }
  return null;
}

function extractImages(html: string, baseUrl: string): ImageWithCaption[] {
  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*/gi;
  const srcsetRegex = /srcset=["']([^"']+)["']/gi;
  const ogImages: string[] = [];
  const seen = new Set<string>();
  const results: ImageWithCaption[] = [];
  // Map from raw src to the full <img> tag for caption extraction
  const imgTagMap = new Map<string, string>();

  // Extract og:image and twitter:image (usually high quality)
  for (const prop of ["og:image", "twitter:image", "twitter:image:src"]) {
    const val = extractMetaContent(html, prop);
    if (val) ogImages.push(val);
  }

  // Collect all candidate URLs
  const candidates: string[] = [...ogImages];

  let match: RegExpExecArray | null;
  while ((match = imgRegex.exec(html)) !== null) {
    candidates.push(match[1]);
    imgTagMap.set(match[1], match[0]);
  }

  // Also grab largest images from srcset attributes
  while ((match = srcsetRegex.exec(html)) !== null) {
    const parts = match[1].split(",").map((s) => s.trim());
    // Pick the last entry (typically the largest)
    const last = parts[parts.length - 1];
    if (last) {
      const url = last.split(/\s+/)[0];
      if (url) candidates.push(url);
    }
  }

  for (const raw of candidates) {
    const decoded = decodeHtmlEntities(raw.trim());
    if (!decoded || decoded.startsWith("data:")) continue;

    // Resolve relative URLs
    let absolute: string;
    try {
      absolute = new URL(decoded, baseUrl).href;
    } catch {
      continue;
    }

    if (seen.has(absolute)) continue;
    seen.add(absolute);

    // Skip icons, logos, tracking pixels, etc.
    if (SKIP_PATTERNS.some((p) => p.test(absolute))) continue;

    // Extract caption: try figcaption first, then img tag attributes
    let caption: string | null = extractFigcaption(html, raw);
    if (!caption) {
      const imgTag = imgTagMap.get(raw);
      if (imgTag) caption = extractCaptionFromImgTag(imgTag);
    }

    results.push({ url: absolute, caption });
  }

  return results.slice(0, 50); // cap at 50 images
}

function extractPageMetadata(html: string, baseUrl: string): PageMetadata {
  // Author / photographer
  const photographer =
    extractMetaContent(html, "author") ??
    extractMetaContent(html, "article:author") ??
    extractMetaContent(html, "og:article:author") ??
    extractMetaContent(html, "photographer") ??
    extractMetaContent(html, "dc.creator") ??
    extractMetaContent(html, "dcterms.creator");

  // Caption / description
  const caption =
    extractMetaContent(html, "og:description") ??
    extractMetaContent(html, "description") ??
    extractMetaContent(html, "twitter:description");

  // Date published
  const rawDate =
    extractMetaContent(html, "article:published_time") ??
    extractMetaContent(html, "og:article:published_time") ??
    extractMetaContent(html, "date") ??
    extractMetaContent(html, "datepublished") ??
    extractMetaContent(html, "dc.date") ??
    extractMetaContent(html, "dcterms.date");
  const datePublished = formatMetaDate(rawDate);

  // Date taken (IPTC / EXIF style, less common in meta tags)
  const rawDateTaken =
    extractMetaContent(html, "date.created") ??
    extractMetaContent(html, "dcterms.created") ??
    extractMetaContent(html, "photo:date_taken");
  const dateTaken = formatMetaDate(rawDateTaken);

  // Location
  const location =
    extractMetaContent(html, "geo.placename") ??
    extractMetaContent(html, "og:locality") ??
    extractMetaContent(html, "og:region") ??
    extractMetaContent(html, "content-location") ??
    extractMetaContent(html, "icbm");

  // Copyright
  const copyright =
    extractMetaContent(html, "copyright") ??
    extractMetaContent(html, "dc.rights") ??
    extractMetaContent(html, "dcterms.rights");

  const images = extractImages(html, baseUrl);

  return {
    photographer,
    caption,
    datePublished,
    dateTaken,
    location,
    copyright,
    pageUrl: "",
    images,
  };
}

// Image proxy endpoint — serves image inline (for gallery thumbnails)
app.get("/api/proxy-image", async (req, res) => {
  const raw = req.query.url;
  const imageUrl = Array.isArray(raw) ? raw[0] : raw;

  if (!imageUrl || typeof imageUrl !== "string") {
    res.status(400).json({ error: "Missing query parameter 'url'" });
    return;
  }

  try {
    const response = await fetch(imageUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; ImageResearchBot/1.0; +http://localhost)",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok || !response.body) {
      res.status(502).json({ error: "Failed to fetch image" });
      return;
    }

    const contentType =
      response.headers.get("content-type") || "image/jpeg";

    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=86400");

    const arrayBuffer = await response.arrayBuffer();
    res.send(Buffer.from(arrayBuffer));
  } catch (err) {
    console.error("Proxy image error:", err);
    res.status(500).json({ error: "Failed to proxy image" });
  }
});

// Download proxy endpoint
app.get("/api/download", async (req, res) => {
  const raw = req.query.url;
  const imageUrl = Array.isArray(raw) ? raw[0] : raw;

  if (!imageUrl || typeof imageUrl !== "string") {
    res.status(400).json({ error: "Missing query parameter 'url'" });
    return;
  }

  try {
    const response = await fetch(imageUrl);
    if (!response.ok || !response.body) {
      res.status(502).json({ error: "Failed to fetch image" });
      return;
    }

    const contentType =
      response.headers.get("content-type") || "application/octet-stream";
    const ext = contentType.includes("png")
      ? ".png"
      : contentType.includes("gif")
        ? ".gif"
        : contentType.includes("webp")
          ? ".webp"
          : ".jpg";

    res.setHeader("Content-Type", contentType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="image${ext}"`
    );

    const arrayBuffer = await response.arrayBuffer();
    res.send(Buffer.from(arrayBuffer));
  } catch (err) {
    console.error("Download error:", err);
    res.status(500).json({ error: "Failed to download image" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
