"use client";

import { ComparisonForm } from "@/components/compare/ComparisonForm";
import { ComparisonPanel } from "@/components/compare/ComparisonPanel";
import { useComparison } from "@/hooks/useComparison";

export default function ComparePage() {
  const { result, isLoading, error, compare } = useComparison();

  return (
    <main className="relative flex min-h-full w-full flex-col">
      <div className="bg-hero-glow pointer-events-none absolute inset-x-0 top-0 h-[24rem] w-full" aria-hidden />

      <div className="relative mx-auto flex w-full max-w-3xl flex-col items-center gap-8 px-8 py-14">
        <div className="max-w-xl space-y-2.5 text-center">
          <h1 className="font-serif text-[28px] font-medium tracking-[-0.3px]">
            See how papers <span className="text-gradient-brand italic">stack up</span>
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Enter two or more arXiv IDs to get an AI-generated comparison of their similarities,
            differences, and unique contributions — grounded only in each paper&apos;s title and
            abstract.
          </p>
        </div>

        <ComparisonForm onCompare={compare} isLoading={isLoading} />
        <ComparisonPanel result={result} isLoading={isLoading} error={error} />
      </div>
    </main>
  );
}
