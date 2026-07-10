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
    <div className="flex flex-wrap gap-1.5">
      {citations.map((citation) => (
        <Link key={citation.index} href={`/papers/${encodeURIComponent(citation.paper_id)}`}>
          <Badge
            variant="outline"
            className="max-w-[16rem] cursor-pointer truncate border-border/60 bg-background/60 hover:border-brand/50 hover:bg-accent"
            title={cleanLatex(citation.snippet)}
          >
            <span className="text-brand">[{citation.index}]</span> {cleanLatex(citation.title)}
            {citation.page ? <span className="text-muted-foreground"> · p.{citation.page}</span> : null}
          </Badge>
        </Link>
      ))}
    </div>
  );
}
