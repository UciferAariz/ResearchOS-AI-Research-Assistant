"use client";

import { useCallback, useState } from "react";
import { ApiError, getSimilarPapers } from "@/services/api";
import type { VectorMatch } from "@/types/vector";

interface UseSimilarityState {
  matches: VectorMatch[];
  isLoading: boolean;
  error: string | null;
}

export function useSimilarity() {
  const [state, setState] = useState<UseSimilarityState>({
    matches: [],
    isLoading: false,
    error: null,
  });

  const loadSimilar = useCallback(async (paperId: string) => {
    setState({ matches: [], isLoading: true, error: null });
    try {
      const matches = await getSimilarPapers(paperId);
      setState({ matches, isLoading: false, error: null });
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Could not load similar papers.";
      setState({ matches: [], isLoading: false, error: message });
    }
  }, []);

  return { ...state, loadSimilar };
}
