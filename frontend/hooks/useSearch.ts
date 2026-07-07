"use client";

import { useCallback, useRef, useState } from "react";
import { ApiError, searchPapers } from "@/services/api";
import type { Paper } from "@/types/paper";

interface UseSearchState {
  papers: Paper[];
  isLoading: boolean;
  error: string | null;
  hasSearched: boolean;
}

export function useSearch() {
  const [state, setState] = useState<UseSearchState>({
    papers: [],
    isLoading: false,
    error: null,
    hasSearched: false,
  });
  const abortRef = useRef<AbortController | null>(null);

  const search = useCallback(async (query: string) => {
    if (!query.trim()) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState((prev) => ({ ...prev, isLoading: true, error: null, hasSearched: true }));

    try {
      const result = await searchPapers(query, 10, controller.signal);
      setState({ papers: result.papers, isLoading: false, error: null, hasSearched: true });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      const message = err instanceof ApiError ? err.message : "Something went wrong while searching.";
      setState({ papers: [], isLoading: false, error: message, hasSearched: true });
    }
  }, []);

  return { ...state, search };
}
