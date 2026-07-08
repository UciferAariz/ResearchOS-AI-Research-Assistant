"use client";

import { useEffect, useState } from "react";
import { ApiError, getPaper } from "@/services/api";
import type { Paper } from "@/types/paper";

interface UsePaperState {
  paper: Paper | null;
  isLoading: boolean;
  error: string | null;
}

export function usePaper(paperId: string) {
  const [state, setState] = useState<UsePaperState>({
    paper: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    const controller = new AbortController();
    setState({ paper: null, isLoading: true, error: null });

    getPaper(paperId, controller.signal)
      .then((paper) => setState({ paper, isLoading: false, error: null }))
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        const message = err instanceof ApiError ? err.message : "Could not load this paper.";
        setState({ paper: null, isLoading: false, error: message });
      });

    return () => controller.abort();
  }, [paperId]);

  return state;
}
