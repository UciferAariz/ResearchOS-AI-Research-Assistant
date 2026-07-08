import { cn } from "@/lib/utils";
import type { Paper } from "@/types/paper";

const SOURCE_LABEL: Record<Paper["source"], string> = {
  arxiv: "arXiv",
  pubmed: "PubMed",
  upload: "Uploaded",
};

const SOURCE_DOT: Record<Paper["source"], string> = {
  arxiv: "bg-source-arxiv",
  pubmed: "bg-source-pubmed",
  upload: "bg-source-upload",
};

interface SourceBadgeProps {
  source: Paper["source"];
  className?: string;
}

export function SourceBadge({ source, className }: SourceBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-secondary/60 px-2 py-0.5 text-xs font-medium text-secondary-foreground",
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", SOURCE_DOT[source])} />
      {SOURCE_LABEL[source]}
    </span>
  );
}
