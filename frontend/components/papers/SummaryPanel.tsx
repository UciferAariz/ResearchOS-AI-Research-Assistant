"use client";

import { useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useStreamingCompletion } from "@/hooks/useStreamingCompletion";
import { getPaperSummaryStreamUrl } from "@/services/api";
import { StreamingText } from "./StreamingText";

interface SummaryPanelProps {
  paperId: string;
}

export function SummaryPanel({ paperId }: SummaryPanelProps) {
  const { text, isStreaming, error, start } = useStreamingCompletion();

  useEffect(() => {
    start(getPaperSummaryStreamUrl(paperId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paperId]);

  if (isStreaming && text.length === 0) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-4 w-1/4" />
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

  return <StreamingText text={text} isStreaming={isStreaming} />;
}
