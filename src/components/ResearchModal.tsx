import { useCallback, useEffect, useState } from "react";
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

function GalleryImage({
  src,
  onSelect,
}: {
  src: string;
  onSelect: (src: string) => void;
}) {
  const [failed, setFailed] = useState(false);
  const proxiedSrc = `/api/proxy-image?url=${encodeURIComponent(src)}`;

  if (failed) return null;

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    downloadImage(src, "image");
  };

  return (
    <div className={styles.galleryItem} onClick={() => onSelect(src)}>
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

function Lightbox({
  src,
  onClose,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
}: {
  src: string;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
}) {
  const proxiedSrc = `/api/proxy-image?url=${encodeURIComponent(src)}`;

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    downloadImage(src, "image");
  };

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft" && hasPrev) onPrev();
      else if (e.key === "ArrowRight" && hasNext) onNext();
    },
    [onClose, onPrev, onNext, hasPrev, hasNext]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  return (
    <div className={styles.lightboxOverlay} onClick={onClose}>
      <button className={styles.lightboxClose} onClick={onClose}>
        ✕
      </button>

      {hasPrev && (
        <button
          className={`${styles.lightboxArrow} ${styles.lightboxArrowLeft}`}
          onClick={(e) => { e.stopPropagation(); onPrev(); }}
          title="Previous image"
        >
          ‹
        </button>
      )}

      <img
        className={styles.lightboxImg}
        src={proxiedSrc}
        alt=""
        onClick={(e) => e.stopPropagation()}
      />

      {hasNext && (
        <button
          className={`${styles.lightboxArrow} ${styles.lightboxArrowRight}`}
          onClick={(e) => { e.stopPropagation(); onNext(); }}
          title="Next image"
        >
          ›
        </button>
      )}

      <button
        className={styles.lightboxDownload}
        onClick={handleDownload}
        title="Download original image"
      >
        ⬇ Download
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
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

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
                {metadata.images.map((src, i) => (
                  <GalleryImage
                    key={src}
                    src={src}
                    onSelect={() => setLightboxIndex(i)}
                  />
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

      {lightboxIndex !== null && metadata.images[lightboxIndex] && (
        <Lightbox
          src={metadata.images[lightboxIndex]}
          onClose={() => setLightboxIndex(null)}
          onPrev={() => setLightboxIndex((i) => Math.max(0, (i ?? 0) - 1))}
          onNext={() =>
            setLightboxIndex((i) =>
              Math.min(metadata.images.length - 1, (i ?? 0) + 1)
            )
          }
          hasPrev={lightboxIndex > 0}
          hasNext={lightboxIndex < metadata.images.length - 1}
        />
      )}
    </div>
  );
}
