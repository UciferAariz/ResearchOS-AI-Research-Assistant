"use client";

import { ComparisonForm } from "@/components/compare/ComparisonForm";
import { ComparisonPanel } from "@/components/compare/ComparisonPanel";
import { useComparison } from "@/hooks/useComparison";

export default function ComparePage() {
  const { result, isLoading, error, compare } = useComparison();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center gap-8 px-6 py-16">
      <div className="max-w-2xl space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Compare Papers</h1>
        <p className="text-sm text-muted-foreground">
          Enter two or more arXiv IDs to get an AI-generated comparison of their
          similarities, differences, and unique contributions — grounded only in
          each paper&apos;s title and abstract.
        </p>
      </div>

      <ComparisonForm onCompare={compare} isLoading={isLoading} />
      <ComparisonPanel result={result} isLoading={isLoading} error={error} />
    </main>
  );
}
