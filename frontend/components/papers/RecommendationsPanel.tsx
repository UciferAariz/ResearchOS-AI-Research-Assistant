"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useRecommendations } from "@/hooks/useRecommendations";

interface RecommendationsPanelProps {
  paperId: string;
}

export function RecommendationsPanel({ paperId }: RecommendationsPanelProps) {
  const { recommendations, isLoading, error } = useRecommendations(paperId);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-destructive" role="alert">
        {error}
      </p>
    );
  }

  if (recommendations.length === 0) {
    return <p className="text-sm text-muted-foreground">No recommendations found for this paper.</p>;
  }

  return (
    <ul className="space-y-3">
      {recommendations.map(({ paper, similarity }) => (
        <li key={paper.id} className="flex items-start justify-between gap-3 rounded-md border p-3">
          <div className="space-y-1">
            <Link
              href={`/papers/${encodeURIComponent(paper.id)}`}
              className="text-sm font-medium hover:underline"
            >
              {paper.title}
            </Link>
            <p className="line-clamp-2 text-xs text-muted-foreground">{paper.abstract}</p>
          </div>
          <Badge variant="outline" className="shrink-0">
            {Math.round(similarity * 100)}%
          </Badge>
        </li>
      ))}
    </ul>
  );
}
