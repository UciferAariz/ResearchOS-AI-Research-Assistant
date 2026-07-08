"use client";

import { useCallback, useRef, useState } from "react";

interface UseStreamingCompletionState {
  text: string;
  isStreaming: boolean;
  error: string | null;
}

/**
 * Consumes a server-sent-events stream via fetch + ReadableStream rather than
 * EventSource, so this same hook can later be reused for POST-based endpoints
 * (e.g. Phase 4 chat) that EventSource can't express.
 */
export function useStreamingCompletion() {
  const [state, setState] = useState<UseStreamingCompletionState>({
    text: "",
    isStreaming: false,
    error: null,
  });
  const abortRef = useRef<AbortController | null>(null);

  const start = useCallback(async (url: string, init?: RequestInit) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState({ text: "", isStreaming: true, error: null });

    try {
      const response = await fetch(url, { ...init, signal: controller.signal });
      if (!response.ok || !response.body) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        // sse-starlette terminates events with "\r\n\r\n" by default; normalize
        // to "\n\n" so the boundary search below works regardless of separator.
        buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");

        let boundary = buffer.indexOf("\n\n");
        while (boundary !== -1) {
          const rawEvent = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 2);

          const eventType = rawEvent.match(/^event:\s*(.*)$/m)?.[1]?.trim() ?? "message";
          // Only a single leading space after "data:" is part of the SSE framing
          // (spec: field-value strips one optional space) — using \s* here would
          // also eat a token's own leading space (e.g. " the"), gluing words together.
          const data = rawEvent.match(/^data: ?(.*)$/m)?.[1] ?? "";

          if (eventType === "token") {
            accumulated += data;
            setState({ text: accumulated, isStreaming: true, error: null });
          } else if (eventType === "error") {
            setState({ text: accumulated, isStreaming: false, error: data || "Stream error" });
            return;
          } else if (eventType === "done") {
            setState({ text: accumulated, isStreaming: false, error: null });
            return;
          }

          boundary = buffer.indexOf("\n\n");
        }
      }
      setState((prev) => ({ ...prev, isStreaming: false }));
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setState((prev) => ({ ...prev, isStreaming: false, error: "Streaming failed." }));
    }
  }, []);

  return { ...state, start };
}
