"use client";

import { useCallback, useState } from "react";
import { ApiError, runEmbeddingBenchmark } from "@/services/api";
import type { BenchmarkResult } from "@/types/vector";

interface UseGpuBenchmarkState {
  result: BenchmarkResult | null;
  isLoading: boolean;
  error: string | null;
}

export function useGpuBenchmark() {
  const [state, setState] = useState<UseGpuBenchmarkState>({
    result: null,
    isLoading: false,
    error: null,
  });

  const runBenchmark = useCallback(async (numTexts = 50) => {
    setState({ result: null, isLoading: true, error: null });
    try {
      const result = await runEmbeddingBenchmark(numTexts);
      setState({ result, isLoading: false, error: null });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Benchmark failed.";
      setState({ result: null, isLoading: false, error: message });
    }
  }, []);

  return { ...state, runBenchmark };
}
