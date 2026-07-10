"use client";

import { useCallback, useRef, useState } from "react";
import { ApiError, comparePapers } from "@/services/api";
import { useSessionStorageState } from "@/hooks/useSessionStorageState";
import { recordActivity } from "@/lib/activity";
import type { ComparisonResult } from "@/types/comparison";

export function useComparison() {
  // result/error survive tab switches and refresh (sessionStorage); isLoading
  // stays plain local state since a stuck "loading" flag from a request that
  // never finished (e.g. the tab was refreshed mid-request) would be wrong.
  const [result, setResult] = useSessionStorageState<ComparisonResult | null>(
    "researchos:compare-result",
    null,
  );
  const [error, setError] = useSessionStorageState<string | null>("researchos:compare-error", null);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const compare = useCallback(
    async (paperIds: string[]) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setResult(null);
      setError(null);
      setIsLoading(true);

      try {
        const comparison = await comparePapers(paperIds, controller.signal);
        setResult(comparison);
        setIsLoading(false);
        recordActivity({
          kind: "compare",
          title: paperIds.join(" vs. "),
          detail: `${paperIds.length} papers compared`,
          href: "/compare",
        });
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof ApiError ? err.message : "Something went wrong while comparing.");
        setIsLoading(false);
      }
    },
    [setResult, setError],
  );

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setResult(null);
    setError(null);
    setIsLoading(false);
  }, [setResult, setError]);

  return { result, isLoading, error, compare, reset };
}
