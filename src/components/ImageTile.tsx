import { useState } from "react";
import type { SearchResult, ResearchMetadata } from "../types";
import { buildCaptionText, copyToClipboard, downloadImage } from "../utils";
import { researchImage } from "../api";
import { ResearchModal } from "./ResearchModal";
import styles from "./ImageTile.module.css";

interface ImageTileProps {
  result: SearchResult;
}

const EMPTY_METADATA: ResearchMetadata = {
  photographer: null,
  caption: null,
  datePublished: null,
  dateTaken: null,
  location: null,
  copyright: null,
  pageUrl: "",
};

export function ImageTile({ result }: ImageTileProps) {
  const [copied, setCopied] = useState(false);
  const [showResearch, setShowResearch] = useState(false);
  const [researchLoading, setResearchLoading] = useState(false);
  const [researchError, setResearchError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<ResearchMetadata>(EMPTY_METADATA);

  const handleCopy = async () => {
    const text = buildCaptionText(result);
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    downloadImage(result.fullImage, result.title);
  };

  const handleResearch = async () => {
    setShowResearch(true);
    setResearchLoading(true);
    setResearchError(null);

    try {
      const data = await researchImage(result.contextLink);
      setMetadata(data);
    } catch (err) {
      setResearchError(
        err instanceof Error ? err.message : "Research failed"
      );
    } finally {
      setResearchLoading(false);
    }
  };

  return (
    <div className={styles.tile}>
      <a
        href={result.contextLink}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.thumbnailLink}
      >
        <img
          className={styles.thumbnail}
          src={result.thumbnail}
          alt={result.title}
          width={result.thumbnailWidth}
          height={result.thumbnailHeight}
          loading="lazy"
        />
      </a>

      <div className={styles.content}>
        <h3 className={styles.title} title={result.title}>
          {result.title}
        </h3>

        <p className={styles.caption}>{result.caption}</p>

        <div className={styles.meta}>
          {result.datePublished && (
            <span className={styles.date}>{result.datePublished}</span>
          )}
          <span className={styles.source}>{result.source}</span>
        </div>

        <div className={styles.actions}>
          <button
            className={styles.actionButton}
            onClick={handleDownload}
            title="Download hi-res image"
          >
            ⬇ Download
          </button>
          <button
            className={`${styles.actionButton} ${copied ? styles.copied : ""}`}
            onClick={handleCopy}
            title="Copy caption and source to clipboard"
          >
            {copied ? "✓ Copied" : "📋 Copy"}
          </button>
          <button
            className={styles.actionButton}
            onClick={handleResearch}
            title="Research image metadata"
          >
            🔍 Research
          </button>
        </div>
      </div>

      {showResearch && (
        <ResearchModal
          metadata={metadata}
          isLoading={researchLoading}
          error={researchError}
          onClose={() => setShowResearch(false)}
        />
      )}
    </div>
  );
}
