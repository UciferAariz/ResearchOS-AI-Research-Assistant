"use client";

import { useCallback, useRef, useState } from "react";
import { ApiError, comparePapers } from "@/services/api";
import type { ComparisonResult } from "@/types/comparison";

interface UseComparisonState {
  result: ComparisonResult | null;
  isLoading: boolean;
  error: string | null;
}

export function useComparison() {
  const [state, setState] = useState<UseComparisonState>({
    result: null,
    isLoading: false,
    error: null,
  });
  const abortRef = useRef<AbortController | null>(null);

  const compare = useCallback(async (paperIds: string[]) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState({ result: null, isLoading: true, error: null });

    try {
      const result = await comparePapers(paperIds, controller.signal);
      setState({ result, isLoading: false, error: null });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      const message = err instanceof ApiError ? err.message : "Something went wrong while comparing.";
      setState({ result: null, isLoading: false, error: message });
    }
  }, []);

  return { ...state, compare };
}
