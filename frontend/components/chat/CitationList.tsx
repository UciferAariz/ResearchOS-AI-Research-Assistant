import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { Citation } from "@/types/chat";

interface CitationListProps {
  citations: Citation[];
}

export function CitationList({ citations }: CitationListProps) {
  if (citations.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 border-t pt-2">
      {citations.map((citation) => (
        <Link key={citation.index} href={`/papers/${encodeURIComponent(citation.paper_id)}`}>
          <Badge variant="outline" className="cursor-pointer hover:bg-accent" title={citation.snippet}>
            [{citation.index}] {citation.title}
          </Badge>
        </Link>
      ))}
    </div>
  );
}
