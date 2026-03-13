import type { SearchResult } from "../types";
import { ImageTile } from "./ImageTile";
import styles from "./ImageGrid.module.css";

interface ImageGridProps {
  results: SearchResult[];
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
}

export function ImageGrid({
  results,
  hasMore,
  isLoadingMore,
  onLoadMore,
}: ImageGridProps) {
  if (results.length === 0) return null;

  return (
    <div>
      <div className={styles.grid}>
        {results.map((result, index) => (
          <ImageTile key={`${result.fullImage}-${index}`} result={result} />
        ))}
      </div>

      {hasMore && (
        <div className={styles.loadMoreWrapper}>
          <button
            className={styles.loadMore}
            onClick={onLoadMore}
            disabled={isLoadingMore}
          >
            {isLoadingMore ? "Loading…" : "Load More"}
          </button>
        </div>
      )}
    </div>
  );
}
