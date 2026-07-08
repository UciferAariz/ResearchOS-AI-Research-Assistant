"use client";

import { useState, type FormEvent } from "react";
import { Input } from "@/components/ui/input";
import { useChatStream } from "@/hooks/useChatStream";
import type { ChatTurn, Citation } from "@/types/chat";
import { CitationList } from "./CitationList";

interface ChatPanelProps {
  paperId?: string;
  placeholder?: string;
}

interface Message extends ChatTurn {
  citations?: Citation[];
}

export function ChatPanel({ paperId, placeholder = "Ask a question…" }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const { answer, citations, isStreaming, error, ask } = useChatStream();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = input.trim();
    if (!message || isStreaming) return;

    const history: ChatTurn[] = messages.map(({ role, content }) => ({ role, content }));
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: message }]);

    const result = await ask({ message, history, paper_id: paperId ?? null, top_k: 5 });
    if (result) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: result.answer, citations: result.citations },
      ]);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4">
        {messages.map((message, i) => (
          <div key={i} className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {message.role === "user" ? "You" : "Assistant"}
            </p>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
              {message.content}
            </p>
            {message.citations && <CitationList citations={message.citations} />}
          </div>
        ))}

        {isStreaming && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Assistant
            </p>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
              {answer}
              <span className="ml-0.5 inline-block h-3 w-1.5 animate-pulse bg-muted-foreground align-middle" />
            </p>
            <CitationList citations={citations} />
          </div>
        )}

        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder}
          className="h-10 text-sm"
          disabled={isStreaming}
          aria-label="Chat message"
        />
        <button
          type="submit"
          disabled={isStreaming || !input.trim()}
          className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity disabled:opacity-50"
        >
          {isStreaming ? "…" : "Send"}
        </button>
      </form>
    </div>
  );
}
