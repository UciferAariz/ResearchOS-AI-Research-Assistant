"use client";

import { motion } from "framer-motion";
import { CheckCircle2, FileText, GitCompare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { ComparisonResult } from "@/types/comparison";
import { cleanLatex } from "@/lib/latex";

interface ComparisonPanelProps {
  result: ComparisonResult | null;
  isLoading: boolean;
  error: string | null;
}

function BulletList({ items, accent }: { items: string[]; accent: string }) {
  return (
    <ul className="space-y-2.5 text-sm text-muted-foreground">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2.5">
          <span className={`mt-1.5 size-1.5 shrink-0 rounded-full ${accent}`} />
          <span className="leading-relaxed">{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function ComparisonPanel({ result, isLoading, error }: ComparisonPanelProps) {
  if (isLoading) {
    return (
      <div className="w-full max-w-2xl space-y-3">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <p className="w-full max-w-2xl rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
        {error}
      </p>
    );
  }

  if (!result) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="w-full max-w-2xl space-y-4"
    >
      <Card className="border-none bg-source-pubmed/10 ring-1 ring-source-pubmed/25">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-source-pubmed">
            <CheckCircle2 className="size-4" />
            Similarities
          </CardTitle>
        </CardHeader>
        <CardContent>
          <BulletList items={result.similarities} accent="bg-source-pubmed" />
        </CardContent>
      </Card>

      <Card className="border-none bg-source-upload/10 ring-1 ring-source-upload/25">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-source-upload">
            <GitCompare className="size-4" />
            Differences
          </CardTitle>
        </CardHeader>
        <CardContent>
          <BulletList items={result.differences} accent="bg-source-upload" />
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        {result.per_paper.map((note, i) => (
          <Card key={note.paper_id} className="ring-1 ring-foreground/10">
            <CardHeader>
              <CardTitle className="flex items-start gap-2">
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-secondary text-[0.65rem] font-semibold text-background">
                  {i + 1}
                </span>
                <span className="flex items-start gap-1.5 leading-snug">
                  <FileText className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                  {cleanLatex(note.title)}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <BulletList items={note.unique_points} accent="bg-brand" />
            </CardContent>
          </Card>
        ))}
      </div>
    </motion.div>
  );
}
