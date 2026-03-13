import type { ResearchMetadata } from "../types";
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

export function ResearchModal({
  metadata,
  isLoading,
  error,
  onClose,
}: ResearchModalProps) {
  const hasData =
    metadata.photographer ||
    metadata.caption ||
    metadata.datePublished ||
    metadata.dateTaken ||
    metadata.location ||
    metadata.copyright;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>Image Research</h3>
          <button className={styles.close} onClick={onClose}>
            ✕
          </button>
        </div>

        <div className={styles.body}>
          {isLoading && <p className={styles.status}>Researching…</p>}

          {error && <p className={styles.error}>{error}</p>}

          {!isLoading && !error && !hasData && (
            <p className={styles.status}>
              No metadata found on the source page.
            </p>
          )}

          {!isLoading && !error && hasData && (
            <div className={styles.metaList}>
              <MetaRow label="Photographer" value={metadata.photographer} />
              <MetaRow label="Caption" value={metadata.caption} />
              <MetaRow label="Date Published" value={metadata.datePublished} />
              <MetaRow label="Date Taken" value={metadata.dateTaken} />
              <MetaRow label="Location" value={metadata.location} />
              <MetaRow label="Copyright" value={metadata.copyright} />
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
