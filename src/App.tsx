import { useState } from "react";
import { searchImages } from "./api";
import type { SearchResult } from "./types";
import { SearchBar } from "./components/SearchBar";
import { ImageGrid } from "./components/ImageGrid";
import styles from "./App.module.css";

export default function App() {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [query, setQuery] = useState("");
  const [nextStart, setNextStart] = useState<number | null>(null);
  const [totalResults, setTotalResults] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (newQuery: string) => {
    setQuery(newQuery);
    setResults([]);
    setError(null);
    setIsLoading(true);

    try {
      const data = await searchImages(newQuery);
      setResults(data.results);
      setNextStart(data.nextStart);
      setTotalResults(data.totalResults);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadMore = async () => {
    if (!nextStart || isLoadingMore) return;
    setIsLoadingMore(true);

    try {
      const data = await searchImages(query, nextStart);
      setResults((prev) => [...prev, ...data.results]);
      setNextStart(data.nextStart);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load more");
    } finally {
      setIsLoadingMore(false);
    }
  };

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <h1 className={styles.title}>Image Research</h1>
      </header>

      <main className={styles.main}>
        <SearchBar onSearch={handleSearch} isLoading={isLoading} />

        {error && <p className={styles.error}>{error}</p>}

        {!isLoading && results.length > 0 && (
          <p className={styles.resultCount}>
            About {Number(totalResults).toLocaleString()} results
          </p>
        )}

        {isLoading && results.length === 0 && (
          <p className={styles.loading}>Searching…</p>
        )}

        <ImageGrid
          results={results}
          hasMore={nextStart !== null}
          isLoadingMore={isLoadingMore}
          onLoadMore={handleLoadMore}
        />
      </main>
    </div>
  );
}
