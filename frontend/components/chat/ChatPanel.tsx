"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, User, Send, Paperclip, Scale } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { cleanLatex } from "@/lib/latex";
import { useChatStream } from "@/hooks/useChatStream";
import { useSessionStorageState } from "@/hooks/useSessionStorageState";
import { recordActivity } from "@/lib/activity";
import { uploadPaper } from "@/services/api";
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

function CitedExtract({ citation }: { citation: Citation }) {
  return (
    <div className="mt-1 overflow-hidden rounded-xl border border-border/50">
      <div className="border-b border-border/50 bg-secondary/40 px-3.5 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.08em] text-muted-foreground">
        Cited extract · [{citation.index}]
      </div>
      <div className="border-l-2 border-brand px-3.5 py-3 font-serif text-sm leading-relaxed text-[#cfc8ba]">
        “{cleanLatex(citation.snippet)}”
      </div>
    </div>
  );
}

function QuickActions({
  citations,
  onCompare,
  onFollowUp,
  onExport,
}: {
  citations: Citation[];
  onCompare: (paperIds: string[]) => void;
  onFollowUp: (message: string) => void;
  onExport: (citations: Citation[]) => void;
}) {
  const distinctPaperIds = Array.from(new Set(citations.map((c) => c.paper_id)));
  return (
    <div className="flex flex-wrap gap-2">
      {distinctPaperIds.length >= 2 && (
        <button
          type="button"
          onClick={() => onCompare(distinctPaperIds)}
          className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-secondary/30 px-3 py-2 text-[13px] font-medium text-foreground transition-colors hover:border-brand/50"
        >
          <Scale className="size-3.5" />
          Compare these {distinctPaperIds.length} →
        </button>
      )}
      <button
        type="button"
        onClick={() => onFollowUp("Summarize each of the cited papers individually.")}
        className="rounded-lg border border-transparent px-3 py-2 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
      >
        Summarize each
      </button>
      <button
        type="button"
        onClick={() => onExport(citations)}
        className="rounded-lg border border-transparent px-3 py-2 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
      >
        Export citations
      </button>
    </div>
  );
}

function Bubble({
  role,
  content,
  citations,
  isStreaming,
  onCompare,
  onFollowUp,
  onExport,
}: {
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  isStreaming?: boolean;
  onCompare?: (paperIds: string[]) => void;
  onFollowUp?: (message: string) => void;
  onExport?: (citations: Citation[]) => void;
}) {
  const isUser = role === "user";
  const cleaned = cleanLatex(content);
  const showActions = !isUser && !isStreaming && citations && citations.length > 0;
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
            <ChatMarkdown content={cleaned} citations={citations} />
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
        {showActions && (
          <QuickActions
            citations={citations}
            onCompare={onCompare!}
            onFollowUp={onFollowUp!}
            onExport={onExport!}
          />
        )}
        {showActions && <CitedExtract citation={citations[0]} />}
      </div>
    </motion.div>
  );
}

function exportCitations(citations: Citation[]) {
  const origin = window.location.origin;
  const text = citations
    .map((c) => `[${c.index}] ${cleanLatex(c.title)}\n${origin}/papers/${encodeURIComponent(c.paper_id)}`)
    .join("\n\n");
  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "citations.txt";
  link.click();
  URL.revokeObjectURL(url);
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
  const [isAttaching, setIsAttaching] = useState(false);
  const { answer, citations, isStreaming, error, ask } = useChatStream();
  const scrollAnchorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    scrollAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, answer]);

  async function sendMessage(message: string) {
    if (!message || isStreaming) return;

    const history: ChatTurn[] = messages.map(({ role, content }) => ({ role, content }));
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = input.trim();
    if (!message) return;
    setInput("");
    await sendMessage(message);
  }

  function handleCompare(paperIds: string[]) {
    window.sessionStorage.setItem("researchos:compare-ids", JSON.stringify(paperIds.slice(0, 5)));
    router.push("/compare");
  }

  async function handleAttachClick() {
    fileInputRef.current?.click();
  }

  async function handleFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setIsAttaching(true);
    try {
      const paper = await uploadPaper(file);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Added **${cleanLatex(paper.title)}** to context — it's now searchable in this chat.`,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Couldn't add that file — please try a different PDF." },
      ]);
    } finally {
      setIsAttaching(false);
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
            <Bubble
              key={i}
              role={message.role}
              content={message.content}
              citations={message.citations}
              onCompare={handleCompare}
              onFollowUp={sendMessage}
              onExport={exportCitations}
            />
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
        <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" onChange={handleFileSelected} />
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder}
          className="h-11 rounded-full px-4 text-sm"
          disabled={isStreaming}
          aria-label="Chat message"
        />
        <button
          type="button"
          onClick={handleAttachClick}
          disabled={isAttaching}
          aria-label="Attach a PDF to context"
          title="Attach a PDF to context"
          className="flex size-11 shrink-0 items-center justify-center rounded-full border border-border/60 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
        >
          <Paperclip className={cn("size-4", isAttaching && "animate-pulse")} />
        </button>
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
