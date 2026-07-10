"use client";

import { Plus, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ComparisonForm } from "@/components/compare/ComparisonForm";
import { ComparisonPanel } from "@/components/compare/ComparisonPanel";
import { useComparison } from "@/hooks/useComparison";

export default function ComparePage() {
  const { result, isLoading, error, compare, reset } = useComparison();

  if (result) {
    return (
      <main className="flex min-h-full w-full flex-col">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-8 py-10">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h1 className="font-serif text-[28px] font-medium tracking-[-0.3px]">
                See how papers <span className="text-gradient-brand italic">stack up</span>
              </h1>
              <p className="mt-1.5 text-sm text-muted-foreground">
                {result.papers.length} papers · aligned by the assistant across {result.dimensions.length}{" "}
                dimensions
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={reset}>
              <Plus className="size-3.5" />
              Add paper
            </Button>
          </div>

          <ComparisonPanel result={result} isLoading={isLoading} error={error} />
        </div>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-full w-full flex-col">
      <div className="bg-hero-glow pointer-events-none absolute inset-x-0 top-0 h-[24rem] w-full" aria-hidden />

      <div className="relative mx-auto flex w-full max-w-3xl flex-col items-center gap-8 px-8 py-14">
        <div className="max-w-xl space-y-2.5 text-center">
          <span className="mx-auto flex w-fit items-center gap-1.5 text-xs font-medium text-brand">
            <Scale className="size-3.5" />
            Compare Papers
          </span>
          <h1 className="font-serif text-[28px] font-medium tracking-[-0.3px]">
            See how papers <span className="text-gradient-brand italic">stack up</span>
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Enter two or more arXiv IDs to get an AI-generated comparison across the dimensions that
            matter most — grounded only in each paper&apos;s title and abstract.
          </p>
        </div>

        <ComparisonForm onCompare={compare} isLoading={isLoading} />
        {(isLoading || error) && <ComparisonPanel result={null} isLoading={isLoading} error={error} />}
      </div>
    </main>
  );
}
