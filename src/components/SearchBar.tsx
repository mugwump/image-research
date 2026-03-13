import { useState, type FormEvent } from "react";
import styles from "./SearchBar.module.css";

interface SearchBarProps {
  onSearch: (query: string) => void;
  isLoading: boolean;
}

export function SearchBar({ onSearch, isLoading }: SearchBarProps) {
  const [query, setQuery] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed) {
      onSearch(trimmed);
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <input
        className={styles.input}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search for images…"
        aria-label="Image search query"
      />
      <button
        className={styles.button}
        type="submit"
        disabled={isLoading || !query.trim()}
      >
        {isLoading ? "Searching…" : "Search"}
      </button>
    </form>
  );
}
