"use client";

import { useCallback, useState } from "react";
import { ApiError, uploadPaper } from "@/services/api";
import type { Paper } from "@/types/paper";
import { z } from "zod";

interface UseUploadPaperState {
  isUploading: boolean;
  error: string | null;
}

export function useUploadPaper() {
  const [state, setState] = useState<UseUploadPaperState>({ isUploading: false, error: null });

  const upload = useCallback(async (file: File): Promise<Paper | null> => {
    setState({ isUploading: true, error: null });
    try {
      const paper = await uploadPaper(file);
      setState({ isUploading: false, error: null });
      return paper;
    } catch (err) {
      let message: string;
      if (err instanceof ApiError) {
        message = err.message;
      } else if (err instanceof z.ZodError) {
        message = "Server returned an unexpected response. Please try again.";
      } else if (err instanceof TypeError) {
        message = "Cannot reach the backend. Make sure the API server is running.";
      } else {
        message = "Could not upload this PDF.";
      }
      setState({ isUploading: false, error: message });
      return null;
    }
  }, []);

  return { ...state, upload };
}
