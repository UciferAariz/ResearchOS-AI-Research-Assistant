import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

// Renders assistant answers as real Markdown (bold, lists, headings, code,
// tables, links) instead of raw text — `content` should already be passed
// through `cleanLatex` so backslash math notation reads as plain prose.
const components: Components = {
  p: ({ className, ...props }) => (
    <p className={cn("leading-relaxed first:mt-0", "mt-3", className)} {...props} />
  ),
  strong: ({ className, ...props }) => (
    <strong className={cn("font-semibold text-current", className)} {...props} />
  ),
  em: ({ className, ...props }) => <em className={cn("italic", className)} {...props} />,
  a: ({ className, ...props }) => (
    <a
      className={cn("text-brand underline underline-offset-2 hover:opacity-80", className)}
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    />
  ),
  ul: ({ className, ...props }) => (
    <ul className={cn("mt-2 list-disc space-y-1 pl-5 marker:text-muted-foreground", className)} {...props} />
  ),
  ol: ({ className, ...props }) => (
    <ol className={cn("mt-2 list-decimal space-y-1 pl-5 marker:text-muted-foreground", className)} {...props} />
  ),
  li: ({ className, ...props }) => <li className={cn("leading-relaxed", className)} {...props} />,
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
  hr: ({ className, ...props }) => (
    <hr className={cn("my-3 border-border/60", className)} {...props} />
  ),
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

export function ChatMarkdown({ content, className }: { content: string; className?: string }) {
  return (
    <div className={cn("text-sm leading-relaxed [&>*:first-child]:mt-0", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
