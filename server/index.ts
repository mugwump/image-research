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

// Download proxy endpoint
app.get("/api/download", async (req, res) => {
  const imageUrl = req.query.url as string;

  if (!imageUrl) {
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
