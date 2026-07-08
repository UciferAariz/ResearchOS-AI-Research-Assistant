"use client";

import { motion } from "framer-motion";
import { Scale } from "lucide-react";
import { ComparisonForm } from "@/components/compare/ComparisonForm";
import { ComparisonPanel } from "@/components/compare/ComparisonPanel";
import { useComparison } from "@/hooks/useComparison";

export default function ComparePage() {
  const { result, isLoading, error, compare } = useComparison();

  return (
    <main className="relative flex min-h-screen w-full flex-col items-center">
      <div className="bg-hero-glow absolute inset-x-0 top-0 h-[24rem] w-full" aria-hidden />

      <div className="relative mx-auto flex w-full max-w-3xl flex-col items-center gap-8 px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="max-w-2xl space-y-2 text-center"
        >
          <span className="flex items-center justify-center gap-1.5 text-xs font-medium text-brand">
            <Scale className="size-3.5" />
            Compare Papers
          </span>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            See how papers <span className="text-gradient-brand">stack up</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Enter two or more arXiv IDs to get an AI-generated comparison of their similarities,
            differences, and unique contributions — grounded only in each paper&apos;s title and
            abstract.
          </p>
        </motion.div>

        <ComparisonForm onCompare={compare} isLoading={isLoading} />
        <ComparisonPanel result={result} isLoading={isLoading} error={error} />
      </div>
    </main>
  );
}
