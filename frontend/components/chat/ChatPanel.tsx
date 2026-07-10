"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Send, Paperclip, Scale } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
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
  /** On the standalone /chat page the messages sit directly on the page (no
   * inline card wrapper), matching the full-height assistant design. Defaults
   * to the bordered inline widget used on the paper detail page. */
  bare?: boolean;
}

interface Message extends ChatTurn {
  citations?: Citation[];
}

// The Corpus mark: a gradient square holding a small outlined square. Used as
// the assistant's avatar throughout the design (chat, reader, compare).
function AssistantMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-gradient-to-br from-brand to-brand-secondary",
        className,
      )}
    >
      <span className="size-[11px] rounded-[3px] border-2 border-background" />
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

  if (isUser) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="flex justify-end"
      >
        <div className="max-w-[78%] whitespace-pre-wrap break-words rounded-[16px] rounded-br-[4px] bg-gradient-to-br from-brand to-[#3a63d9] px-[18px] py-[13px] text-[14.5px] leading-relaxed text-white shadow-[0_6px_18px_rgba(75,123,255,0.28)]">
          {cleaned}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="flex items-start gap-3.5"
    >
      <AssistantMark />
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        {cleaned ? (
          <div className="text-[14.5px] leading-[1.65] text-foreground/90">
            <ChatMarkdown content={cleaned} citations={citations} />
            {isStreaming && (
              <span className="ml-0.5 inline-block h-3.5 w-1.5 translate-y-0.5 animate-pulse rounded-sm bg-muted-foreground/70" />
            )}
          </div>
        ) : isStreaming ? (
          <span className="flex items-center gap-1.5 py-1">
            <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/70 [animation-delay:-0.3s]" />
            <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/70 [animation-delay:-0.15s]" />
            <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/70" />
          </span>
        ) : null}
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

export function ChatPanel({ paperId, placeholder = "Ask a question…", bare = false }: ChatPanelProps) {
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
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div
        className={cn(
          "flex flex-1 flex-col",
          bare
            ? "min-h-0 gap-[26px] overflow-y-auto"
            : "min-h-[16rem] gap-5 rounded-2xl border border-border/60 bg-secondary/20 p-4 sm:p-5",
        )}
      >
        {isEmpty && (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 py-10 text-center">
            <AssistantMark className="size-10 rounded-xl" />
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

      <form
        onSubmit={handleSubmit}
        className="flex shrink-0 items-end gap-2 rounded-2xl border border-border/60 bg-secondary/40 py-2 pl-[18px] pr-2"
      >
        <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" onChange={handleFileSelected} />
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder}
          disabled={isStreaming}
          aria-label="Chat message"
          className="min-w-0 flex-1 bg-transparent py-2 text-[15px] text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-60"
        />
        <button
          type="button"
          onClick={handleAttachClick}
          disabled={isAttaching}
          aria-label="Attach a PDF to context"
          title="Attach a PDF to context"
          className="flex size-9 shrink-0 items-center justify-center rounded-[10px] border border-border/60 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
        >
          <Paperclip className={cn("size-[18px]", isAttaching && "animate-pulse")} />
        </button>
        <button
          type="submit"
          disabled={isStreaming || !input.trim()}
          aria-label="Send"
          className="flex size-9 shrink-0 items-center justify-center rounded-[11px] bg-gradient-to-br from-brand to-[#3a63d9] text-white shadow-[0_6px_16px_rgba(75,123,255,0.3)] transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          <Send className="size-[18px]" />
        </button>
      </form>
    </div>
  );
}
