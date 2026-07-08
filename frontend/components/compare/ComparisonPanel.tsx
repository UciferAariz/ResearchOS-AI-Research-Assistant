"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { ComparisonResult } from "@/types/comparison";

interface ComparisonPanelProps {
  result: ComparisonResult | null;
  isLoading: boolean;
  error: string | null;
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

export function ComparisonPanel({ result, isLoading, error }: ComparisonPanelProps) {
  if (isLoading) {
    return (
      <div className="w-full max-w-2xl space-y-3">
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

  if (!result) return null;

  return (
    <div className="w-full max-w-2xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Similarities</CardTitle>
        </CardHeader>
        <CardContent>
          <BulletList items={result.similarities} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Differences</CardTitle>
        </CardHeader>
        <CardContent>
          <BulletList items={result.differences} />
        </CardContent>
      </Card>

      {result.per_paper.map((note) => (
        <Card key={note.paper_id}>
          <CardHeader>
            <CardTitle>{note.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <BulletList items={note.unique_points} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
