import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { Citation } from "@/types/chat";
import { cleanLatex } from "@/lib/latex";

interface CitationListProps {
  citations: Citation[];
}

export function CitationList({ citations }: CitationListProps) {
  if (citations.length === 0) return null;

  return (
    <div className="flex max-w-full flex-wrap gap-1.5">
      {citations.map((citation) => (
        <Link
          key={citation.index}
          href={`/papers/${encodeURIComponent(citation.paper_id)}`}
          className="inline-block min-w-0 max-w-[16rem]"
        >
          <Badge
            variant="outline"
            className="w-full min-w-0 cursor-pointer gap-1 border-border/60 bg-background/60 hover:border-brand/50 hover:bg-accent"
            title={cleanLatex(citation.snippet)}
          >
            <span className="shrink-0 text-brand">[{citation.index}]</span>
            <span className="min-w-0 flex-1 truncate">{cleanLatex(citation.title)}</span>
            {citation.page ? (
              <span className="shrink-0 text-muted-foreground">p.{citation.page}</span>
            ) : null}
          </Badge>
        </Link>
      ))}
    </div>
  );
}
