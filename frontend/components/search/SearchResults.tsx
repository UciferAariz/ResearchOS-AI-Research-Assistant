"use client";

import { Skeleton } from "@/components/ui/skeleton";
import type { Paper } from "@/types/paper";
import { PaperCard } from "./PaperCard";

interface SearchResultsProps {
  papers: Paper[];
  isLoading: boolean;
  error: string | null;
  hasSearched: boolean;
}

function ResultsSkeleton() {
  return (
    <div className="grid w-full max-w-5xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="space-y-3 rounded-lg border p-4">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-16 w-full" />
        </div>
      ))}
    </div>
  );
}

export function SearchResults({ papers, isLoading, error, hasSearched }: SearchResultsProps) {
  if (isLoading) return <ResultsSkeleton />;

  if (error) {
    return (
      <p className="text-sm text-destructive" role="alert">
        {error}
      </p>
    );
  }

  if (hasSearched && papers.length === 0) {
    return <p className="text-sm text-muted-foreground">No papers found. Try a different query.</p>;
  }

  if (papers.length === 0) return null;

  return (
    <div className="grid w-full max-w-5xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {papers.map((paper, index) => (
        <PaperCard key={paper.id} paper={paper} index={index} />
      ))}
    </div>
  );
}
