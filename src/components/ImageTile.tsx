import { useState } from "react";
import type { SearchResult } from "../types";
import { buildCaptionText, copyToClipboard, downloadImage } from "../utils";
import styles from "./ImageTile.module.css";

interface ImageTileProps {
  result: SearchResult;
}

export function ImageTile({ result }: ImageTileProps) {
  const [copied, setCopied] = useState(false);

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
        </div>
      </div>
    </div>
  );
}
