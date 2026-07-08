"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SourceBadge } from "@/components/papers/SourceBadge";
import type { Paper } from "@/types/paper";
import { SimilarPapers } from "./SimilarPapers";

interface PaperCardProps {
  paper: Paper;
  index: number;
}

export function PaperCard({ paper, index }: PaperCardProps) {
  const [showSimilar, setShowSimilar] = useState(false);

  const publishedDate = new Date(paper.published).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
    >
      <Card className="h-full transition-colors hover:border-primary/40">
        <CardHeader>
          <SourceBadge source={paper.source} className="mb-1 w-fit" />
          <CardTitle className="text-base leading-snug">
            <Link href={`/papers/${encodeURIComponent(paper.id)}`} className="hover:underline">
              {paper.title}
            </Link>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            {paper.authors.slice(0, 3).join(", ")}
            {paper.authors.length > 3 ? ", et al." : ""}
          </p>
          <p className="line-clamp-4 text-sm text-muted-foreground">{paper.abstract}</p>
          <div className="flex items-center justify-between pt-1">
            <Badge variant="secondary">{publishedDate}</Badge>
            <a
              href={paper.pdf_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-primary hover:underline"
            >
              View PDF →
            </a>
          </div>
          <button
            type="button"
            onClick={() => setShowSimilar((prev) => !prev)}
            className="text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            {showSimilar ? "Hide related papers" : "Show related papers"}
          </button>
          {showSimilar && <SimilarPapers paperId={paper.id} />}
        </CardContent>
      </Card>
    </motion.div>
  );
}
