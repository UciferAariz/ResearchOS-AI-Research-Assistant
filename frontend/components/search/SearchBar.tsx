"use client";

import { useState, type FormEvent } from "react";
import { Input } from "@/components/ui/input";

interface SearchBarProps {
  onSearch: (query: string) => void;
  isLoading: boolean;
}

export function SearchBar({ onSearch, isLoading }: SearchBarProps) {
  const [query, setQuery] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSearch(query);
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-2xl gap-2">
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search research papers on arXiv…"
        className="h-12 text-base"
        aria-label="Search research papers"
      />
      <button
        type="submit"
        disabled={isLoading || !query.trim()}
        className="h-12 rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground transition-opacity disabled:opacity-50"
      >
        {isLoading ? "Searching…" : "Search"}
      </button>
    </form>
  );
}
