"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { RecommendationsPanel } from "@/components/papers/RecommendationsPanel";
import { SourceBadge } from "@/components/papers/SourceBadge";
import { SummaryPanel } from "@/components/papers/SummaryPanel";
import { Skeleton } from "@/components/ui/skeleton";
import { usePaper } from "@/hooks/usePaper";
import { cleanLatex } from "@/lib/latex";

export default function PaperDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const paperId = decodeURIComponent(params.id);
  const { paper, isLoading, error } = usePaper(paperId);
  const [copied, setCopied] = useState(false);

  return (
    <div className="min-h-full w-full overflow-y-auto">
      <div className="mx-auto max-w-[1100px] px-11 pb-16 pt-8">
        <button
          type="button"
          onClick={() => router.back()}
          className="mb-6 inline-flex items-center gap-2 rounded-[9px] border border-border/60 px-3 py-[7px] text-[12.5px] font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          ← Back
        </button>

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
          <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[1fr_300px]">
            <div>
              <div className="mb-3.5 flex flex-wrap items-center gap-2.5">
                <SourceBadge source={paper.source} />
                {paper.source === "arxiv" && (
                  <span className="font-mono text-xs text-muted-foreground">
                    doi:10.48550/arXiv.{paper.id}
                  </span>
                )}
                {paper.source === "pubmed" && (
                  <span className="font-mono text-xs text-muted-foreground">PMID:{paper.id}</span>
                )}
              </div>
              <h1 className="mb-3.5 font-serif text-[34px] font-medium leading-[1.18] tracking-[-0.4px]">
                {cleanLatex(paper.title)}
              </h1>
              {paper.authors.length > 0 && (
                <div className="mb-6 text-sm text-muted-foreground">{paper.authors.join(", ")}</div>
              )}

              <div className="mb-7 rounded-[15px] border border-brand/20 bg-gradient-to-b from-brand/[0.08] to-brand-secondary/[0.03] p-6">
                <div className="mb-3.5 flex items-center gap-2">
                  <div className="flex size-[22px] items-center justify-center rounded-[6px] bg-gradient-to-br from-brand to-brand-secondary">
                    <div className="size-2 rounded-[2px] border-[1.5px] border-background" />
                  </div>
                  <span className="font-mono text-[10.5px] uppercase tracking-[1.2px] text-brand">
                    AI summary · key points
                  </span>
                </div>
                <SummaryPanel paperId={paper.id} />
              </div>

              <h2 className="mb-3.5 font-serif text-[21px] font-medium">Abstract</h2>
              <p className="mb-6 font-serif text-[15.5px] leading-[1.75] text-[#cfc8ba]">{cleanLatex(paper.abstract)}</p>

              <div className="mt-6 flex flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    const year = paper.published ? new Date(paper.published).getFullYear() : "n.d.";
                    const citation = `${paper.authors.join(", ")} (${year}). ${cleanLatex(paper.title)}.`;
                    navigator.clipboard.writeText(citation).then(() => {
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    });
                  }}
                  className="flex items-center gap-2 rounded-[10px] bg-gradient-to-br from-brand to-[#3a63d9] px-4 py-2.5 text-[13px] font-semibold text-white transition-[filter] hover:brightness-110"
                >
                  {copied ? "Copied ✓" : "Cite"}
                </button>
                <button
                  type="button"
                  onClick={() => document.getElementById("ask")?.scrollIntoView({ behavior: "smooth" })}
                  className="flex items-center gap-2 rounded-[10px] border border-border/60 px-4 py-2.5 text-[13px] font-medium text-foreground transition-colors hover:border-brand/50"
                >
                  Ask about this paper
                </button>
                {paper.pdf_url && (
                  <a
                    href={paper.pdf_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-[10px] border border-border/60 px-4 py-2.5 text-[13px] font-medium text-foreground transition-colors hover:border-brand/50"
                  >
                    View PDF ↗
                  </a>
                )}
              </div>

              <div id="ask" className="mt-10 space-y-3 border-t border-border/60 pt-6">
                <h2 className="font-serif text-[19px] font-medium">Ask about this paper</h2>
                <ChatPanel paperId={paper.id} placeholder="Ask a question about this paper…" />
              </div>
            </div>

            <div className="flex flex-col gap-[18px] lg:sticky lg:top-0">
              <div className="rounded-[14px] border border-border/60 bg-secondary/20 p-[18px]">
                <div className="mb-3.5 font-mono text-[10px] uppercase tracking-[1.2px] text-muted-foreground">
                  At a glance
                </div>
                <Stat k="Source" v={paper.source === "arxiv" ? "arXiv" : paper.source === "pubmed" ? "PubMed" : "Uploaded PDF"} />
                <Stat
                  k="Published"
                  v={
                    paper.source === "upload"
                      ? "—"
                      : new Date(paper.published).toLocaleDateString(undefined, { year: "numeric", month: "short" })
                  }
                />
                <Stat k="Authors" v={String(paper.authors.length || "—")} />
              </div>
              <div className="rounded-[14px] border border-border/60 bg-secondary/20 p-[18px]">
                <div className="mb-3.5 font-mono text-[10px] uppercase tracking-[1.2px] text-muted-foreground">
                  Related in your library
                </div>
                <RecommendationsPanel paperId={paper.id} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between border-b border-border/40 py-2 last:border-0">
      <span className="text-[13px] text-muted-foreground">{k}</span>
      <span className="text-[13.5px] font-medium">{v}</span>
    </div>
  );
}
