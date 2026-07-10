"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, User, Send } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { cleanLatex } from "@/lib/latex";
import { useChatStream } from "@/hooks/useChatStream";
import { useSessionStorageState } from "@/hooks/useSessionStorageState";
import { recordActivity } from "@/lib/activity";
import type { ChatTurn, Citation } from "@/types/chat";
import { ChatMarkdown } from "./ChatMarkdown";
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
  content,
  citations,
  isStreaming,
}: {
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  isStreaming?: boolean;
}) {
  const isUser = role === "user";
  const cleaned = cleanLatex(content);
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={cn("flex items-start gap-2.5", isUser && "flex-row-reverse")}
    >
      <Avatar role={role} />
      <div className={cn("flex min-w-0 max-w-[88%] flex-col gap-2 sm:max-w-[80%]", isUser && "items-end")}>
        <div
          className={cn(
            "min-w-0 rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
            isUser
              ? "rounded-tr-sm bg-primary text-primary-foreground"
              : "rounded-tl-sm bg-card text-card-foreground ring-1 ring-foreground/10",
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap break-words">{cleaned}</p>
          ) : cleaned ? (
            <ChatMarkdown content={cleaned} />
          ) : isStreaming ? (
            <span className="flex items-center gap-1 py-0.5">
              <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/70 [animation-delay:-0.3s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/70 [animation-delay:-0.15s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/70" />
            </span>
          ) : null}
          {isStreaming && cleaned && (
            <span className="ml-0.5 inline-block h-3.5 w-1.5 translate-y-0.5 animate-pulse rounded-sm bg-muted-foreground/70" />
          )}
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
      recordActivity({
        kind: "chat",
        title: message,
        detail: `${result.citations.length} source${result.citations.length === 1 ? "" : "s"} cited`,
        href: paperId ? `/papers/${encodeURIComponent(paperId)}` : "/chat",
      });
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
            <Bubble key={i} role={message.role} content={message.content} citations={message.citations} />
          ))}

          {isStreaming && (
            <Bubble key="streaming" role="assistant" content={answer} citations={citations} isStreaming />
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
