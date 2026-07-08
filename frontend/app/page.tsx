"use client";

import Link from "next/link";
import { GpuBenchmarkPanel } from "@/components/diagnostics/GpuBenchmarkPanel";
import { SearchBar } from "@/components/search/SearchBar";
import { SearchResults } from "@/components/search/SearchResults";
import { useSearch } from "@/hooks/useSearch";

export default function Home() {
  const { papers, isLoading, error, hasSearched, search } = useSearch();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col items-center gap-10 px-6 py-16">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">ResearchOS</h1>
        <p className="text-sm text-muted-foreground">AI-powered Research Operating System</p>
        <Link href="/chat" className="text-sm font-medium text-primary hover:underline">
          Chat across indexed papers →
        </Link>
      </div>

      <SearchBar onSearch={search} isLoading={isLoading} />

      <SearchResults papers={papers} isLoading={isLoading} error={error} hasSearched={hasSearched} />

      <GpuBenchmarkPanel />
    </main>
  );
}
