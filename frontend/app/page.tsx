"use client";

import { motion } from "framer-motion";
import { GpuBenchmarkPanel } from "@/components/diagnostics/GpuBenchmarkPanel";
import { UploadPanel } from "@/components/papers/UploadPanel";
import { SearchBar } from "@/components/search/SearchBar";
import { SearchResults } from "@/components/search/SearchResults";
import { useSearch } from "@/hooks/useSearch";

const SOURCES = [
  { label: "arXiv", dot: "bg-source-arxiv" },
  { label: "PubMed", dot: "bg-source-pubmed" },
  { label: "Your PDFs", dot: "bg-source-upload" },
];

export default function Home() {
  const { papers, isLoading, error, hasSearched, search } = useSearch();

  return (
    <main className="relative flex min-h-screen w-full flex-col items-center">
      <div className="bg-hero-glow absolute inset-x-0 top-0 h-[32rem] w-full" aria-hidden />

      <div className="relative mx-auto flex w-full max-w-6xl flex-col items-center gap-10 px-6 pb-16 pt-20">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col items-center gap-4 text-center"
        >
          <span className="rounded-full border border-border/60 bg-secondary/50 px-3 py-1 text-xs font-medium text-muted-foreground">
            AMD ROCm-accelerated retrieval
          </span>
          <h1 className="max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
            Your <span className="text-gradient-brand">research operating system</span>
          </h1>
          <p className="max-w-xl text-balance text-sm text-muted-foreground sm:text-base">
            Search arXiv and PubMed side by side, chat with citations, compare papers, and get
            AI summaries — all grounded in the actual text.
          </p>
          <div className="flex items-center gap-4 pt-1 text-xs text-muted-foreground">
            {SOURCES.map((source) => (
              <span key={source.label} className="flex items-center gap-1.5">
                <span className={`size-1.5 rounded-full ${source.dot}`} />
                {source.label}
              </span>
            ))}
          </div>
        </motion.div>

        <SearchBar onSearch={search} isLoading={isLoading} />

        <UploadPanel />

        <SearchResults papers={papers} isLoading={isLoading} error={error} hasSearched={hasSearched} />

        {!hasSearched && (
          <div className="flex w-full justify-center pt-4">
            <GpuBenchmarkPanel />
          </div>
        )}
      </div>
    </main>
  );
}
