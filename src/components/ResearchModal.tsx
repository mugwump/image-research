import { useState } from "react";
import type { ResearchMetadata } from "../types";
import { downloadImage } from "../utils";
import styles from "./ResearchModal.module.css";

interface ResearchModalProps {
  metadata: ResearchMetadata;
  isLoading: boolean;
  error: string | null;
  onClose: () => void;
}

interface MetaRowProps {
  label: string;
  value: string | null;
}

function MetaRow({ label, value }: MetaRowProps) {
  if (!value) return null;
  return (
    <div className={styles.row}>
      <span className={styles.label}>{label}</span>
      <span className={styles.value}>{value}</span>
    </div>
  );
}

function GalleryImage({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);
  const proxiedSrc = `/api/proxy-image?url=${encodeURIComponent(src)}`;

  if (failed) return null;

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    downloadImage(src, "image");
  };

  return (
    <div className={styles.galleryItem}>
      <img
        className={styles.galleryImg}
        src={proxiedSrc}
        alt=""
        loading="lazy"
        onError={() => setFailed(true)}
      />
      <button
        className={styles.downloadOverlay}
        onClick={handleDownload}
        title="Download original image"
      >
        ⬇
      </button>
    </div>
  );
}

export function ResearchModal({
  metadata,
  isLoading,
  error,
  onClose,
}: ResearchModalProps) {
  const hasMetaData =
    metadata.photographer ||
    metadata.caption ||
    metadata.datePublished ||
    metadata.dateTaken ||
    metadata.location ||
    metadata.copyright;

  const hasImages = metadata.images.length > 0;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={`${styles.modal} ${hasImages ? styles.modalWide : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <h3 className={styles.title}>Image Research</h3>
          <button className={styles.close} onClick={onClose}>
            ✕
          </button>
        </div>

        <div className={styles.body}>
          {isLoading && <p className={styles.status}>Researching…</p>}

          {error && <p className={styles.error}>{error}</p>}

          {!isLoading && !error && !hasMetaData && !hasImages && (
            <p className={styles.status}>
              No metadata or images found on the source page.
            </p>
          )}

          {!isLoading && !error && hasMetaData && (
            <div className={styles.metaList}>
              <MetaRow label="Photographer" value={metadata.photographer} />
              <MetaRow label="Caption" value={metadata.caption} />
              <MetaRow label="Date Published" value={metadata.datePublished} />
              <MetaRow label="Date Taken" value={metadata.dateTaken} />
              <MetaRow label="Location" value={metadata.location} />
              <MetaRow label="Copyright" value={metadata.copyright} />
            </div>
          )}

          {!isLoading && !error && hasImages && (
            <div className={styles.gallerySection}>
              <span className={styles.gallerySectionLabel}>
                Images from source ({metadata.images.length})
              </span>
              <div className={styles.gallery}>
                {metadata.images.map((src) => (
                  <GalleryImage key={src} src={src} />
                ))}
              </div>
            </div>
          )}

          {!isLoading && metadata.pageUrl && (
            <a
              className={styles.sourceLink}
              href={metadata.pageUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              View source page →
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
