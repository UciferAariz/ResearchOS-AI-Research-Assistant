"use client";

import { useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useSimilarity } from "@/hooks/useSimilarity";
import { cleanLatex } from "@/lib/latex";

interface SimilarPapersProps {
  paperId: string;
}

export function SimilarPapers({ paperId }: SimilarPapersProps) {
  const { matches, isLoading, error, loadSimilar } = useSimilarity();

  useEffect(() => {
    loadSimilar(paperId);
  }, [paperId, loadSimilar]);

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    );
  }

  if (error) {
    return <p className="text-xs text-muted-foreground">{error}</p>;
  }

  if (matches.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">Related papers</p>
      <ul className="space-y-1">
        {matches.map((match) => (
          <li key={match.id} className="flex items-center justify-between gap-2 text-xs">
            <span className="truncate">{cleanLatex(match.metadata.title) || match.id}</span>
            <Badge variant="outline" className="shrink-0">
              {Math.round(match.similarity * 100)}%
            </Badge>
          </li>
        ))}
      </ul>
    </div>
  );
}
