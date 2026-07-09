"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, User, Send } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useChatStream } from "@/hooks/useChatStream";
import { useSessionStorageState } from "@/hooks/useSessionStorageState";
import type { ChatTurn, Citation } from "@/types/chat";
import { CitationList } from "./CitationList";

interface ChatPanelProps {
  paperId?: string;
  placeholder?: string;
}

interface Message extends ChatTurn {
  citations?: Citation[];
}

function Avatar({ role }: { role: "user" | "assistant" }) {
  return (
    <span
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-full",
        role === "assistant"
          ? "bg-gradient-to-br from-brand to-brand-secondary text-background"
          : "bg-secondary text-secondary-foreground",
      )}
    >
      {role === "assistant" ? <Sparkles className="size-3.5" /> : <User className="size-3.5" />}
    </span>
  );
}

function Bubble({
  role,
  children,
  citations,
}: {
  role: "user" | "assistant";
  children: React.ReactNode;
  citations?: Citation[];
}) {
  const isUser = role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={cn("flex items-start gap-2.5", isUser && "flex-row-reverse")}
    >
      <Avatar role={role} />
      <div className={cn("flex max-w-[85%] flex-col gap-2", isUser && "items-end")}>
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
            isUser
              ? "rounded-tr-sm bg-primary text-primary-foreground"
              : "rounded-tl-sm bg-card text-card-foreground ring-1 ring-foreground/10",
          )}
        >
          <p className="whitespace-pre-wrap">{children}</p>
        </div>
        {citations && citations.length > 0 && <CitationList citations={citations} />}
      </div>
    </motion.div>
  );
}

export function ChatPanel({ paperId, placeholder = "Ask a question…" }: ChatPanelProps) {
  // Keyed per paper (or "global" for the standalone /chat tab) so history
  // persists across tab switches and refreshes for the lifetime of the
  // browser tab, without mixing a paper-scoped conversation with another.
  const [messages, setMessages] = useSessionStorageState<Message[]>(
    `researchos:chat-messages:${paperId ?? "global"}`,
    [],
  );
  const [input, setInput] = useState("");
  const { answer, citations, isStreaming, error, ask } = useChatStream();
  const scrollAnchorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, answer]);

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

  const isEmpty = messages.length === 0 && !isStreaming;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex min-h-[16rem] flex-col gap-5 rounded-2xl border border-border/60 bg-secondary/20 p-4 sm:p-5">
        {isEmpty && (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 py-10 text-center">
            <span className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-secondary text-background">
              <Sparkles className="size-4" />
            </span>
            <p className="text-sm text-muted-foreground">
              Ask a question to get started — answers are grounded in indexed papers.
            </p>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((message, i) => (
            <Bubble key={i} role={message.role} citations={message.citations}>
              {message.content}
            </Bubble>
          ))}

          {isStreaming && (
            <Bubble key="streaming" role="assistant" citations={citations}>
              {answer}
              <span className="ml-0.5 inline-block h-3 w-1.5 animate-pulse bg-muted-foreground align-middle" />
            </Bubble>
          )}
        </AnimatePresence>

        {error && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        <div ref={scrollAnchorRef} />
      </div>

      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder}
          className="h-11 rounded-full px-4 text-sm"
          disabled={isStreaming}
          aria-label="Chat message"
        />
        <button
          type="submit"
          disabled={isStreaming || !input.trim()}
          aria-label="Send"
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-secondary text-background transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          <Send className="size-4" />
        </button>
      </form>
    </div>
  );
}
