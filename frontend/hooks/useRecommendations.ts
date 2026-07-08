"use client";

import { useEffect, useState } from "react";
import { ApiError, getRecommendations } from "@/services/api";
import type { RecommendedPaper } from "@/types/recommendation";

interface UseRecommendationsState {
  recommendations: RecommendedPaper[];
  isLoading: boolean;
  error: string | null;
}

export function useRecommendations(paperId: string) {
  const [state, setState] = useState<UseRecommendationsState>({
    recommendations: [],
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    const controller = new AbortController();
    setState({ recommendations: [], isLoading: true, error: null });

    getRecommendations([paperId], 6, controller.signal)
      .then((result) =>
        setState({ recommendations: result.recommendations, isLoading: false, error: null }),
      )
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        const message = err instanceof ApiError ? err.message : "Could not load recommendations.";
        setState({ recommendations: [], isLoading: false, error: message });
      });

    return () => controller.abort();
  }, [paperId]);

  return state;
}
