"use client";

import { useParams } from "next/navigation";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { RecommendationsPanel } from "@/components/papers/RecommendationsPanel";
import { SummaryPanel } from "@/components/papers/SummaryPanel";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { usePaper } from "@/hooks/usePaper";

export default function PaperDetailsPage() {
  const params = useParams<{ id: string }>();
  const paperId = decodeURIComponent(params.id);
  const { paper, isLoading, error } = usePaper(paperId);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-8 px-6 py-16">
      {isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-24 w-full" />
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {paper && (
        <div className="space-y-4">
          <h1 className="text-2xl font-semibold leading-snug tracking-tight">{paper.title}</h1>
          {paper.authors.length > 0 && (
            <p className="text-sm text-muted-foreground">{paper.authors.join(", ")}</p>
          )}
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {paper.source === "upload"
                ? "Uploaded PDF"
                : new Date(paper.published).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
            </Badge>
            {paper.pdf_url && (
              <a
                href={paper.pdf_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-primary hover:underline"
              >
                View PDF →
              </a>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{paper.abstract}</p>
        </div>
      )}

      {paper && (
        <div className="space-y-3 border-t pt-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            AI Summary
          </h2>
          <SummaryPanel paperId={paper.id} />
        </div>
      )}

      {paper && (
        <div className="space-y-3 border-t pt-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Ask About This Paper
          </h2>
          <ChatPanel paperId={paper.id} placeholder="Ask a question about this paper…" />
        </div>
      )}

      {paper && (
        <div className="space-y-3 border-t pt-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            You Might Also Like
          </h2>
          <RecommendationsPanel paperId={paper.id} />
        </div>
      )}
    </main>
  );
}
