"use client";

import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import type { ComparisonResult } from "@/types/comparison";
import { cleanLatex } from "@/lib/latex";
import { cn } from "@/lib/utils";

interface ComparisonPanelProps {
  result: ComparisonResult | null;
  isLoading: boolean;
  error: string | null;
}

const SOURCE_LABEL: Record<string, string> = { arxiv: "arXiv", pubmed: "PubMed", upload: "Uploaded" };
const SOURCE_COLOR: Record<string, string> = {
  arxiv: "text-source-arxiv",
  pubmed: "text-source-pubmed",
  upload: "text-source-upload",
};

export function ComparisonPanel({ result, isLoading, error }: ComparisonPanelProps) {
  if (isLoading) {
    return (
      <div className="w-full space-y-3">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-16 w-full rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <p className="w-full rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
        {error}
      </p>
    );
  }

  if (!result) return null;

  const columns = result.papers.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="w-full space-y-[22px]"
    >
      <div className="overflow-x-auto rounded-2xl border border-border/60">
        <div className="min-w-[720px]">
          <div className="grid" style={{ gridTemplateColumns: `168px repeat(${columns}, minmax(0, 1fr))` }}>
            <div className="border-b border-border/60 bg-secondary/40" />
            {result.papers.map((paper) => (
              <div
                key={paper.paper_id}
                className="border-b border-l border-border/60 bg-secondary/15 p-5"
              >
                <span
                  className={cn(
                    "font-mono text-[10px] uppercase tracking-[0.05em]",
                    SOURCE_COLOR[paper.source] ?? "text-muted-foreground",
                  )}
                >
                  {SOURCE_LABEL[paper.source] ?? paper.source}
                </span>
                <h3 className="mt-2 font-serif text-base font-medium leading-snug break-words hyphens-auto">
                  {cleanLatex(paper.title)}
                </h3>
                <div className="mt-1.5 truncate text-xs text-muted-foreground">
                  {paper.authors.join(", ") || "—"}
                </div>
              </div>
            ))}
          </div>

          {result.dimensions.map((dim, i) => (
            <div
              key={dim.label}
              className="grid"
              style={{
                gridTemplateColumns: `168px repeat(${columns}, minmax(0, 1fr))`,
                background: i % 2 === 1 ? "color-mix(in oklch, var(--secondary), transparent 60%)" : undefined,
              }}
            >
              <div className="flex items-center border-b border-border/40 px-[18px] py-4 font-mono text-[11px] uppercase leading-snug tracking-[0.05em] text-muted-foreground">
                {dim.label}
              </div>
              {dim.values.map((value, j) => (
                <div
                  key={j}
                  className="border-b border-l border-border/40 px-[18px] py-4 text-[13.5px] leading-relaxed text-foreground/90 break-words"
                >
                  {cleanLatex(value)}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {result.assistant_take && (
        <div className="flex items-start gap-3.5 rounded-[14px] border border-brand-secondary/25 bg-gradient-to-b from-brand-secondary/10 to-transparent px-[22px] py-[18px]">
          <div className="flex size-[26px] flex-none items-center justify-center rounded-lg bg-gradient-to-br from-brand to-brand-secondary">
            <div className="size-[9px] rounded-[2px] border-[1.5px] border-background" />
          </div>
          <p className="text-sm leading-relaxed text-foreground/90">
            <span className="font-semibold text-foreground">Assistant&apos;s take: </span>
            {cleanLatex(result.assistant_take)}
          </p>
        </div>
      )}
    </motion.div>
  );
}
