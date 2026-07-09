"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState, type FormEvent } from "react";
import { Scale, Search as SearchIcon } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { SimilarPapers } from "@/components/search/SimilarPapers";
import { SourceBadge } from "@/components/papers/SourceBadge";
import { useSearch } from "@/hooks/useSearch";
import { recordActivity } from "@/lib/activity";
import type { Paper, PaperSource } from "@/types/paper";

const YEAR_BUCKETS = ["2024", "2023", "2022 & earlier"] as const;
type YearBucket = (typeof YEAR_BUCKETS)[number];

function yearBucketOf(published: string): YearBucket {
  const year = new Date(published).getFullYear();
  if (year === 2024) return "2024";
  if (year === 2023) return "2023";
  return "2022 & earlier";
}

function DiscoverContent() {
  const router = useRouter();
  const params = useSearchParams();
  const query = params.get("q") ?? "";
  const { papers, isLoading, error, hasSearched, search } = useSearch();

  const [queryInput, setQueryInput] = useState(query);
  const [sourceFilter, setSourceFilter] = useState<Set<PaperSource>>(new Set());
  const [yearFilter, setYearFilter] = useState<Set<YearBucket>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    setQueryInput(query);
    if (query.trim()) search(query);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  useEffect(() => {
    if (hasSearched && !isLoading && !error && query.trim()) {
      recordActivity({
        kind: "search",
        title: query,
        detail: `${papers.length} result${papers.length === 1 ? "" : "s"}`,
        href: `/discover?q=${encodeURIComponent(query)}`,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  const sourceCounts = useMemo(() => {
    const counts: Record<PaperSource, number> = { arxiv: 0, pubmed: 0, upload: 0 };
    for (const p of papers) counts[p.source] += 1;
    return counts;
  }, [papers]);

  const yearCounts = useMemo(() => {
    const counts: Record<YearBucket, number> = { "2024": 0, "2023": 0, "2022 & earlier": 0 };
    for (const p of papers) counts[yearBucketOf(p.published)] += 1;
    return counts;
  }, [papers]);

  const filtered = useMemo(() => {
    return papers.filter((p) => {
      if (sourceFilter.size > 0 && !sourceFilter.has(p.source)) return false;
      if (yearFilter.size > 0 && !yearFilter.has(yearBucketOf(p.published))) return false;
      return true;
    });
  }, [papers, sourceFilter, yearFilter]);

  function toggle<T>(set: Set<T>, setSet: (s: Set<T>) => void, value: T) {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    setSet(next);
  }

  function goCompareSelected() {
    const ids = Array.from(selected);
    if (ids.length < 2) return;
    try {
      window.sessionStorage.setItem("researchos:compare-ids", JSON.stringify(ids));
    } catch {
      // storage unavailable — user can still fill the compare form manually
    }
    router.push("/compare");
  }

  function submitSearch(e: FormEvent) {
    e.preventDefault();
    if (!queryInput.trim()) return;
    router.push(`/discover?q=${encodeURIComponent(queryInput)}`);
  }

  return (
    <div className="flex h-full min-h-screen w-full flex-col">
      <div className="flex items-center gap-4 border-b border-border/60 px-10 py-[22px]">
        <form
          onSubmit={submitSearch}
          className="flex flex-1 items-center gap-3 rounded-[13px] border border-border/60 bg-secondary/30 px-[18px] py-3"
        >
          <SearchIcon className="size-[18px] flex-none text-brand" />
          <input
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            placeholder="Search research papers…"
            className="flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
          />
          <Link
            href="/chat"
            className="flex items-center gap-1.5 rounded-lg border border-brand-secondary/40 bg-brand-secondary/[0.08] px-3.5 py-1.5 text-[12.5px] font-medium text-brand-secondary transition-colors hover:bg-brand-secondary/[0.16]"
          >
            Ask instead
          </Link>
        </form>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-[232px] flex-none overflow-y-auto border-r border-border/60 p-6">
          <FilterGroup
            label="Source"
            options={(["arxiv", "pubmed", "upload"] as PaperSource[]).map((s) => ({
              key: s,
              name: s === "arxiv" ? "arXiv" : s === "pubmed" ? "PubMed" : "Uploaded",
              n: sourceCounts[s],
            }))}
            active={sourceFilter}
            onToggle={(k) => toggle(sourceFilter, setSourceFilter, k as PaperSource)}
          />
          <FilterGroup
            label="Year"
            options={YEAR_BUCKETS.map((y) => ({ key: y, name: y, n: yearCounts[y] }))}
            active={yearFilter}
            onToggle={(k) => toggle(yearFilter, setYearFilter, k as YearBucket)}
          />
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-6">
          <div className="mb-5 flex items-center justify-between">
            <div className="text-[13.5px] text-muted-foreground">
              <span className="font-medium text-foreground">{filtered.length}</span> papers
              {query && (
                <>
                  {" "}
                  for <span className="text-foreground">&ldquo;{query}&rdquo;</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-3">
              {selected.size > 0 && (
                <span className="text-[12.5px] text-muted-foreground">Selected {selected.size}</span>
              )}
              <button
                type="button"
                onClick={goCompareSelected}
                disabled={selected.size < 2}
                className="flex items-center gap-1.5 rounded-[9px] bg-gradient-to-br from-brand to-[#3a63d9] px-3.5 py-2 text-[12.5px] font-semibold text-white transition-opacity disabled:opacity-40"
              >
                <Scale className="size-3.5" />
                Compare papers
              </button>
            </div>
          </div>

          {isLoading && (
            <div className="flex flex-col gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-40 w-full rounded-[15px]" />
              ))}
            </div>
          )}

          {!isLoading && error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          {!isLoading && !error && hasSearched && filtered.length === 0 && (
            <p className="text-sm text-muted-foreground">No papers found. Try a different query or filters.</p>
          )}

          {!isLoading &&
            !error &&
            filtered.map((paper) => (
              <ResultCard
                key={paper.id}
                paper={paper}
                selected={selected.has(paper.id)}
                onToggleSelect={() => toggle(selected, setSelected, paper.id)}
                expanded={expanded.has(paper.id)}
                onToggleExpand={() => toggle(expanded, setExpanded, paper.id)}
              />
            ))}
        </div>
      </div>
    </div>
  );
}

function FilterGroup({
  label,
  options,
  active,
  onToggle,
}: {
  label: string;
  options: { key: string; name: string; n: number }[];
  active: Set<string>;
  onToggle: (key: string) => void;
}) {
  return (
    <div className="mb-[26px]">
      <div className="mb-3 font-mono text-[10.5px] uppercase tracking-[1.2px] text-muted-foreground">{label}</div>
      {options.map((opt) => {
        const checked = active.has(opt.key);
        return (
          <label
            key={opt.key}
            className="flex cursor-pointer items-center gap-2.5 py-1.5 text-[13.5px] text-muted-foreground hover:text-foreground"
          >
            <span
              className={`flex size-[15px] flex-none items-center justify-center rounded-[4px] border-[1.5px] text-[10px] ${
                checked ? "border-brand bg-brand text-white" : "border-border bg-transparent"
              }`}
            >
              {checked && "✓"}
            </span>
            <input type="checkbox" className="hidden" checked={checked} onChange={() => onToggle(opt.key)} />
            <span className="flex-1">{opt.name}</span>
            <span className="font-mono text-[11px] text-muted-foreground/70">{opt.n}</span>
          </label>
        );
      })}
    </div>
  );
}

function ResultCard({
  paper,
  selected,
  onToggleSelect,
  expanded,
  onToggleExpand,
}: {
  paper: Paper;
  selected: boolean;
  onToggleSelect: () => void;
  expanded: boolean;
  onToggleExpand: () => void;
}) {
  const year = new Date(paper.published).getFullYear();

  return (
    <div
      className={`relative mb-4 rounded-[15px] border p-[22px] transition-all hover:-translate-y-0.5 ${
        selected ? "border-brand/50 bg-brand/[0.06]" : "border-border/60 bg-secondary/20"
      }`}
    >
      <div className="flex gap-[18px]">
        <div className="min-w-0 flex-1">
          <div className="mb-2.5 flex flex-wrap items-center gap-2.5">
            <SourceBadge source={paper.source} />
            <span className="font-mono text-xs text-muted-foreground">{year}</span>
          </div>
          <h3 className="mb-2 font-serif text-xl font-medium leading-[1.28] tracking-[-0.2px]">
            <Link href={`/papers/${encodeURIComponent(paper.id)}`} className="hover:text-brand">
              {paper.title}
            </Link>
          </h3>
          <div className="mb-3 text-[13px] text-muted-foreground">
            {paper.authors.slice(0, 4).join(", ")}
            {paper.authors.length > 4 ? ", et al." : ""}
          </div>
          <p className="mb-3 line-clamp-3 text-sm leading-relaxed text-[#cfc8ba] dark:text-[#cfc8ba]">
            {paper.abstract}
          </p>
          <button
            type="button"
            onClick={onToggleExpand}
            className="text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            {expanded ? "Hide related papers" : "Show related papers"}
          </button>
          {expanded && (
            <div className="mt-2">
              <SimilarPapers paperId={paper.id} />
            </div>
          )}
        </div>
        <div className="flex w-[130px] flex-none flex-col items-end gap-2.5">
          <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <input type="checkbox" checked={selected} onChange={onToggleSelect} />
            Select
          </label>
          <Link
            href={`/papers/${encodeURIComponent(paper.id)}`}
            className="w-full rounded-[9px] border border-border/60 bg-transparent px-3 py-2 text-center text-[12.5px] font-medium text-foreground transition-colors hover:border-brand"
          >
            Read
          </Link>
          <a
            href={paper.pdf_url}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full rounded-[9px] border border-border/40 bg-transparent px-3 py-2 text-center text-[12.5px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            PDF ↗
          </a>
        </div>
      </div>
    </div>
  );
}

export default function DiscoverPage() {
  return (
    <Suspense>
      <DiscoverContent />
    </Suspense>
  );
}
