"use client";

import { motion } from "framer-motion";
import { MessageSquare, Scale, Upload } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { GpuBenchmarkPanel } from "@/components/diagnostics/GpuBenchmarkPanel";
import { UploadPanel } from "@/components/papers/UploadPanel";
import { SearchBar } from "@/components/search/SearchBar";
import { getActivity, type ActivityItem } from "@/lib/activity";

const SUGGESTIONS = [
  "continual learning in large language models",
  "retrieval-augmented generation evaluation",
  "RLHF and alignment methods",
];

const KIND_META: Record<ActivityItem["kind"], { label: string; color: string; tint: string }> = {
  search: { label: "Search", color: "text-muted-foreground", tint: "bg-muted" },
  chat: { label: "Chat", color: "text-brand", tint: "bg-brand/12" },
  compare: { label: "Compare", color: "text-brand-secondary", tint: "bg-brand-secondary/12" },
  read: { label: "Read", color: "text-source-upload", tint: "bg-source-upload/12" },
};

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function Home() {
  const router = useRouter();
  const [recents, setRecents] = useState<ActivityItem[]>([]);

  useEffect(() => {
    setRecents(getActivity().slice(0, 4));
  }, []);

  function goSearch(query: string) {
    if (!query.trim()) return;
    router.push(`/discover?q=${encodeURIComponent(query)}`);
  }

  return (
    <main className="relative flex min-h-full w-full flex-col">
      <div className="bg-hero-glow pointer-events-none absolute inset-x-0 top-0 h-[32rem] w-full" aria-hidden />

      <div className="relative mx-auto flex w-full max-w-5xl flex-col gap-10 px-8 pb-16 pt-10">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[11px] tracking-[1.4px] text-muted-foreground">
            {new Date().toLocaleDateString(undefined, { weekday: "long", day: "2-digit", month: "short" }).toUpperCase()}
          </span>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col items-center gap-3 pb-2 text-center"
        >
          <span className="font-mono text-[11.5px] uppercase tracking-[3px] text-brand">{greeting()}</span>
          <h1 className="max-w-2xl font-serif text-5xl font-medium leading-[1.05] tracking-[-0.5px]">
            Your research
            <br />
            <span className="text-gradient-brand italic">operating system</span>
          </h1>
          <p className="max-w-lg text-balance text-base leading-relaxed text-muted-foreground">
            Ask a question, paste a DOI, or drop a PDF. Corpus reads, connects, and remembers everything
            for you.
          </p>

          <div className="mt-4 w-full max-w-2xl">
            <SearchBar onSearch={goSearch} isLoading={false} />
            <div className="mt-5 flex flex-wrap justify-center gap-2.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => goSearch(s)}
                  className="rounded-full border border-border/60 bg-secondary/40 px-4 py-2 text-[13px] text-muted-foreground transition-colors hover:border-brand/50 hover:text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="rounded-[18px] border border-border/60 bg-secondary/20 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-serif text-[19px] font-medium">Continue where you left off</h2>
              <Link href="/history" className="text-[12.5px] text-brand hover:underline">
                History →
              </Link>
            </div>
            {recents.length === 0 ? (
              <p className="py-6 text-sm text-muted-foreground">
                Nothing yet — search, chat, or open a paper and it&apos;ll show up here.
              </p>
            ) : (
              <div className="flex flex-col gap-1">
                {recents.map((item) => {
                  const meta = KIND_META[item.kind];
                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      className="flex gap-3.5 rounded-xl p-3 transition-colors hover:bg-accent/50"
                    >
                      <span
                        className={`flex size-[38px] flex-none items-center justify-center rounded-[10px] text-xs font-semibold ${meta.tint} ${meta.color}`}
                      >
                        {meta.label[0]}
                      </span>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{item.title}</div>
                        <div className="mt-0.5 text-[12.5px] text-muted-foreground">
                          {meta.label} · {item.detail}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-[18px] border border-border/60 bg-secondary/20 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-serif text-[19px] font-medium">Quick actions</h2>
            </div>
            <div className="flex flex-col gap-1">
              <Link
                href="/chat"
                className="flex items-center gap-3.5 rounded-xl p-3 text-sm transition-colors hover:bg-accent/50"
              >
                <span className="flex size-[38px] flex-none items-center justify-center rounded-[10px] bg-brand/12 text-brand">
                  <MessageSquare className="size-4" />
                </span>
                Ask your research assistant
              </Link>
              <Link
                href="/compare"
                className="flex items-center gap-3.5 rounded-xl p-3 text-sm transition-colors hover:bg-accent/50"
              >
                <span className="flex size-[38px] flex-none items-center justify-center rounded-[10px] bg-brand-secondary/12 text-brand-secondary">
                  <Scale className="size-4" />
                </span>
                Compare papers side by side
              </Link>
              <a
                href="#upload"
                className="flex items-center gap-3.5 rounded-xl p-3 text-sm transition-colors hover:bg-accent/50"
              >
                <span className="flex size-[38px] flex-none items-center justify-center rounded-[10px] bg-source-upload/12 text-source-upload">
                  <Upload className="size-4" />
                </span>
                Upload a PDF to your library
              </a>
            </div>
          </div>
        </div>

        <div id="upload" className="flex flex-col items-center gap-8 pt-4">
          <UploadPanel />
          <GpuBenchmarkPanel />
        </div>
      </div>
    </main>
  );
}
