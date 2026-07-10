import Link from "next/link";
import { useMemo } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import type { Citation } from "@/types/chat";

// Renders assistant answers as real Markdown (bold, lists, headings, code,
// tables, links) instead of raw text — `content` should already be passed
// through `cleanLatex` so backslash math notation reads as plain prose.

// The RAG system prompt (see backend/app/rag/prompts.py) requires every
// factual claim to end in a bracketed citation marker like "[1]" or "[2]".
// Turning those into markdown links here (rather than asking the model to
// emit links directly) keeps the LLM's output format simple while still
// giving the marker a real destination — the cited paper.
function linkifyCitations(content: string): string {
  return content.replace(/\[(\d+)\](?!\()/g, "[[$1]](#cite-$1)");
}

function buildComponents(citations: Citation[]): Components {
  return {
    p: ({ className, ...props }) => (
      <p className={cn("leading-relaxed first:mt-0", "mt-3", className)} {...props} />
    ),
    strong: ({ className, ...props }) => (
      <strong className={cn("font-semibold text-current", className)} {...props} />
    ),
    em: ({ className, ...props }) => <em className={cn("italic", className)} {...props} />,
    a: ({ href, className, children, ...props }) => {
      if (href?.startsWith("#cite-")) {
        const index = Number(href.slice("#cite-".length));
        const citation = citations.find((c) => c.index === index);
        if (citation) {
          return (
            <Link
              href={`/papers/${encodeURIComponent(citation.paper_id)}`}
              title={citation.title}
              className="mx-0.5 rounded px-1 font-mono text-[0.85em] font-medium text-brand ring-1 ring-brand/25 hover:bg-brand/10"
            >
              {children}
            </Link>
          );
        }
      }
      return (
        <a
          href={href}
          className={cn("text-brand underline underline-offset-2 hover:opacity-80", className)}
          target="_blank"
          rel="noopener noreferrer"
          {...props}
        >
          {children}
        </a>
      );
    },
    ul: ({ className, ...props }) => (
      <ul className={cn("mt-2 list-disc space-y-1 pl-5 marker:text-muted-foreground", className)} {...props} />
    ),
    // Ordered lists carry the RAG answer's structured breakdowns (e.g. "three
    // methods, and where they disagree") — styled as individual cards with a
    // numbered badge rather than a plain decimal list, matching the design's
    // "method card" treatment.
    ol: ({ className, ...props }) => (
      <ol className={cn("mt-3 flex list-none flex-col gap-2.5 pl-0", className)} {...props} />
    ),
    li: ({ className, ...props }) => (
      <li
        className={cn(
          "leading-relaxed",
          "[ol>&]:relative [ol>&]:rounded-xl [ol>&]:border [ol>&]:border-border/50 [ol>&]:bg-secondary/25 [ol>&]:py-2.5 [ol>&]:pl-9 [ol>&]:pr-3.5",
          "[ol>&]:before:absolute [ol>&]:before:left-2.5 [ol>&]:before:top-2.5 [ol>&]:before:flex [ol>&]:before:size-5 [ol>&]:before:items-center [ol>&]:before:justify-center [ol>&]:before:rounded-full [ol>&]:before:bg-brand/15 [ol>&]:before:font-mono [ol>&]:before:text-[10.5px] [ol>&]:before:font-semibold [ol>&]:before:text-brand [ol>&]:before:content-[counter(list-item)]",
          "[ol>&]:[counter-increment:list-item]",
          className,
        )}
        {...props}
      />
    ),
    h1: ({ className, ...props }) => (
      <h1 className={cn("mt-4 font-serif text-base font-semibold first:mt-0", className)} {...props} />
    ),
    h2: ({ className, ...props }) => (
      <h2 className={cn("mt-4 font-serif text-[15px] font-semibold first:mt-0", className)} {...props} />
    ),
    h3: ({ className, ...props }) => (
      <h3 className={cn("mt-3 font-serif text-sm font-semibold first:mt-0", className)} {...props} />
    ),
    blockquote: ({ className, ...props }) => (
      <blockquote
        className={cn("mt-3 border-l-2 border-brand/40 pl-3 text-muted-foreground italic", className)}
        {...props}
      />
    ),
    hr: ({ className, ...props }) => <hr className={cn("my-3 border-border/60", className)} {...props} />,
    pre: ({ className, ...props }) => (
      <pre
        className={cn(
          "mt-3 overflow-x-auto rounded-lg bg-foreground/5 p-3 font-mono text-xs leading-relaxed ring-1 ring-foreground/10",
          "[&>code]:rounded-none [&>code]:bg-transparent [&>code]:p-0 [&>code]:ring-0",
          className,
        )}
        {...props}
      />
    ),
    code: ({ className, ...props }) => (
      <code
        className={cn(
          "rounded bg-foreground/10 px-1 py-0.5 font-mono text-[0.85em] ring-1 ring-foreground/10",
          className,
        )}
        {...props}
      />
    ),
    table: ({ className, ...props }) => (
      <div className="mt-3 overflow-x-auto">
        <table className={cn("w-full border-collapse text-xs", className)} {...props} />
      </div>
    ),
    th: ({ className, ...props }) => (
      <th
        className={cn("border border-border/60 bg-foreground/5 px-2 py-1 text-left font-semibold", className)}
        {...props}
      />
    ),
    td: ({ className, ...props }) => (
      <td className={cn("border border-border/60 px-2 py-1 align-top", className)} {...props} />
    ),
  };
}

export function ChatMarkdown({
  content,
  citations = [],
  className,
}: {
  content: string;
  citations?: Citation[];
  className?: string;
}) {
  const components = useMemo(() => buildComponents(citations), [citations]);
  const linked = useMemo(() => linkifyCitations(content), [content]);

  return (
    <div className={cn("text-sm leading-relaxed [&>*:first-child]:mt-0 [&_ol]:[counter-reset:list-item]", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {linked}
      </ReactMarkdown>
    </div>
  );
}
