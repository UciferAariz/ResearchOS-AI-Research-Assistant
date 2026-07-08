"use client";

import { useCallback, useRef, useState } from "react";
import { buildChatStreamRequest } from "@/services/api";
import type { ChatRequest, Citation } from "@/types/chat";

interface UseChatStreamState {
  answer: string;
  citations: Citation[];
  isStreaming: boolean;
  error: string | null;
}

interface ChatStreamResult {
  answer: string;
  citations: Citation[];
}

const INITIAL_STATE: UseChatStreamState = {
  answer: "",
  citations: [],
  isStreaming: false,
  error: null,
};

/**
 * Consumes the /api/chat/stream SSE response, which emits a "citations"
 * event (retrieval already ran) before any "token" events, so citations are
 * available to render alongside the answer as it streams in.
 *
 * `ask` resolves with the final answer/citations (rather than callers reading
 * hook state after the await) so a stale closure over pre-stream state can't
 * be mistaken for the finished result.
 */
export function useChatStream() {
  const [state, setState] = useState<UseChatStreamState>(INITIAL_STATE);
  const abortRef = useRef<AbortController | null>(null);

  const ask = useCallback(async (payload: ChatRequest): Promise<ChatStreamResult | null> => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState({ answer: "", citations: [], isStreaming: true, error: null });

    let answer = "";
    let citations: Citation[] = [];

    try {
      const { url, init } = buildChatStreamRequest(payload);
      const response = await fetch(url, { ...init, signal: controller.signal });
      if (!response.ok || !response.body) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let boundary = buffer.indexOf("\n\n");
        while (boundary !== -1) {
          const rawEvent = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 2);

          const eventType = rawEvent.match(/^event:\s*(.*)$/m)?.[1]?.trim() ?? "message";
          const data = rawEvent.match(/^data:\s*(.*)$/m)?.[1] ?? "";

          if (eventType === "citations") {
            citations = data ? (JSON.parse(data) as Citation[]) : [];
            setState({ answer, citations, isStreaming: true, error: null });
          } else if (eventType === "token") {
            answer += data;
            setState({ answer, citations, isStreaming: true, error: null });
          } else if (eventType === "error") {
            setState({ answer, citations, isStreaming: false, error: data || "Stream error" });
            return null;
          } else if (eventType === "done") {
            setState({ answer, citations, isStreaming: false, error: null });
            return { answer, citations };
          }

          boundary = buffer.indexOf("\n\n");
        }
      }
      setState((prev) => ({ ...prev, isStreaming: false }));
      return { answer, citations };
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return null;
      setState((prev) => ({ ...prev, isStreaming: false, error: "Chat request failed." }));
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setState(INITIAL_STATE);
  }, []);

  return { ...state, ask, reset };
}
