"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { getActivityByKind, getLastReadPaper } from "@/lib/activity";

interface NavItem {
  href?: string;
  label: string;
  match: (path: string) => boolean;
  icon: ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  {
    href: "/",
    label: "Home",
    match: (path: string) => path === "/",
    icon: (
      <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7">
        <circle cx="6" cy="6" r="2.4" />
        <circle cx="14" cy="6" r="2.4" />
        <circle cx="6" cy="14" r="2.4" />
        <circle cx="14" cy="14" r="2.4" />
      </svg>
    ),
  },
  {
    href: "/discover",
    label: "Discover",
    match: (path: string) => path.startsWith("/discover"),
    icon: (
      <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7">
        <circle cx="8.5" cy="8.5" r="5.5" />
        <line x1="12.6" y1="12.6" x2="17" y2="17" />
      </svg>
    ),
  },
  {
    href: "/chat",
    label: "Assistant",
    match: (path: string) => path === "/chat",
    icon: (
      <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7">
        <path d="M3 5.5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H8l-4 3.2V13H5a2 2 0 0 1-2-2z" />
      </svg>
    ),
  },
  {
    label: "Reader",
    match: (path: string) => path.startsWith("/papers/"),
    icon: (
      <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7">
        <path d="M10 4.5C8.5 3.3 6 3 4 3.4v11C6 14 8.5 14.3 10 15.5M10 4.5c1.5-1.2 4-1.5 6-1.1v11c-2-.4-4.5-.1-6 1.1M10 4.5v11" />
      </svg>
    ),
  },
  {
    href: "/compare",
    label: "Compare",
    match: (path: string) => path === "/compare",
    icon: (
      <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7">
        <rect x="3" y="4" width="6" height="12" rx="1.4" />
        <rect x="11" y="4" width="6" height="12" rx="1.4" />
      </svg>
    ),
  },
  {
    href: "/history",
    label: "History",
    match: (path: string) => path === "/history",
    icon: (
      <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7">
        <circle cx="10" cy="10" r="7" />
        <path d="M10 6v4l2.6 1.6" />
      </svg>
    ),
  },
];

const SOURCE_LIBRARY = [
  { key: "arxiv", label: "arXiv", dot: "bg-source-arxiv" },
  { key: "pubmed", label: "PubMed", dot: "bg-source-pubmed" },
  { key: "upload", label: "Uploaded PDFs", dot: "bg-source-upload" },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const [readCounts, setReadCounts] = useState<Record<string, number>>({});
  const [lastPaperHref, setLastPaperHref] = useState<string | null>(null);

  useEffect(() => {
    const reads = getActivityByKind("read", 100);
    const seen = new Map<string, string>();
    for (const item of reads) {
      if (!seen.has(item.href)) seen.set(item.href, item.detail);
    }
    const counts: Record<string, number> = { arxiv: 0, pubmed: 0, upload: 0 };
    for (const detail of Array.from(seen.values())) {
      const lower = detail.toLowerCase();
      if (lower.includes("pubmed")) counts.pubmed += 1;
      else if (lower.includes("uploaded")) counts.upload += 1;
      else counts.arxiv += 1;
    }
    setReadCounts(counts);
    setLastPaperHref(getLastReadPaper()?.href ?? null);
  }, [pathname]);

  return (
    <aside className="flex w-64 flex-none flex-col border-r border-border/60 bg-sidebar px-4 py-5">
      <Link href="/" className="flex items-center gap-2.5 px-2 pb-[22px]">
        <div className="flex size-[34px] flex-none items-center justify-center rounded-[10px] bg-gradient-to-br from-brand to-brand-secondary shadow-[0_6px_20px_rgba(75,123,255,0.35)]">
          <div className="size-[13px] rounded-[4px] border-[2.5px] border-background" />
        </div>
        <div>
          <div className="font-serif text-[19px] font-semibold leading-none tracking-[0.2px]">Corpus</div>
          <div className="mt-[3px] font-mono text-[9.5px] uppercase tracking-[1.5px] text-muted-foreground">
            research OS
          </div>
        </div>
      </Link>

      <nav className="flex flex-col gap-0.5">
        {NAV_ITEMS.map((item) => {
          const active = item.match(pathname ?? "");
          const href = item.href ?? lastPaperHref ?? "/discover";
          return (
            <Link
              key={item.label}
              href={href}
              className={cn(
                "flex w-full items-center gap-3 rounded-[10px] border border-transparent px-3 py-2.5 font-sans text-sm font-medium transition-colors",
                active
                  ? "border-border bg-gradient-to-r from-brand/[0.18] to-brand-secondary/[0.04] text-foreground shadow-[inset_2px_0_0_var(--brand)]"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-[18px] border-t border-border/60 pt-[18px]">
        <div className="px-2 pb-2.5 font-mono text-[9.5px] uppercase tracking-[1.4px] text-muted-foreground/80">
          Library
        </div>
        {SOURCE_LIBRARY.map((source) => (
          <div
            key={source.key}
            className="flex items-center gap-2.5 rounded-lg px-2 py-[7px] text-[13px] text-muted-foreground"
          >
            <span className={cn("size-[7px] flex-none rounded-[2px]", source.dot)} />
            <span className="flex-1 truncate">{source.label}</span>
            <span className="font-mono text-[11px] text-muted-foreground/70">
              {readCounts[source.key] ?? 0}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-auto pt-4">
        <Link
          href="/"
          className="mb-3 flex w-full items-center gap-2.5 rounded-[11px] bg-gradient-to-br from-brand to-[#3a63d9] px-3.5 py-[11px] font-sans text-[13.5px] font-semibold text-white shadow-[0_8px_22px_rgba(75,123,255,0.32)] transition-[filter] hover:brightness-110"
        >
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="10" y1="4" x2="10" y2="16" />
            <line x1="4" y1="10" x2="16" y2="10" />
          </svg>
          <span>Add new knowledge</span>
        </Link>
        <div className="flex items-center gap-2.5 rounded-[11px] px-2 py-2 text-muted-foreground">
          <div className="flex size-[34px] flex-none items-center justify-center rounded-[9px] bg-secondary">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M4 16v-1a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v1" />
              <circle cx="10" cy="6.5" r="3" />
            </svg>
          </div>
          <div className="min-w-0 leading-[1.3]">
            <div className="truncate text-[13px] font-medium text-foreground">Local library</div>
            <div className="text-[11px] text-muted-foreground">No account needed</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
