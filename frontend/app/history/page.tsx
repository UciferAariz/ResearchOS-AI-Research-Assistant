"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { getActivity, groupActivityByDay, type ActivityItem, type ActivityKind } from "@/lib/activity";

const FILTERS: { key: ActivityKind | "all"; label: string }[] = [
  { key: "all", label: "All activity" },
  { key: "search", label: "Searches" },
  { key: "chat", label: "Chats" },
  { key: "read", label: "Reads" },
  { key: "compare", label: "Comparisons" },
];

const KIND_META: Record<ActivityKind, { color: string; tint: string; dot: string }> = {
  search: { color: "text-muted-foreground", tint: "bg-muted", dot: "bg-muted-foreground" },
  chat: { color: "text-brand", tint: "bg-brand/12", dot: "bg-brand" },
  compare: { color: "text-brand-secondary", tint: "bg-brand-secondary/12", dot: "bg-brand-secondary" },
  read: { color: "text-source-upload", tint: "bg-source-upload/12", dot: "bg-source-upload" },
};

export default function HistoryPage() {
  const router = useRouter();
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [filter, setFilter] = useState<ActivityKind | "all">("all");

  useEffect(() => {
    setItems(getActivity());
  }, []);

  const filtered = filter === "all" ? items : items.filter((i) => i.kind === filter);
  const groups = groupActivityByDay(filtered);

  return (
    <div className="min-h-full w-full overflow-y-auto">
      <div className="mx-auto max-w-[860px] px-11 pb-16 pt-10">
        <button
          type="button"
          onClick={() => router.back()}
          className="mb-6 inline-flex items-center gap-2 rounded-[9px] border border-border/60 px-3 py-[7px] text-[12.5px] font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          ← Back
        </button>

        <div className="mb-[30px]">
          <h1 className="mb-2 font-serif text-[30px] font-medium tracking-[-0.3px]">History &amp; journal</h1>
          <p className="text-[14.5px] text-muted-foreground">
            Every search, chat, and paper you&apos;ve opened — stored locally in this browser.
          </p>
        </div>

        <div className="mb-[30px] flex flex-wrap gap-2.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={cn(
                "rounded-full border px-[15px] py-2 text-[12.5px] font-medium transition-colors",
                filter === f.key
                  ? "border-foreground bg-foreground text-background"
                  : "border-border/60 text-muted-foreground hover:border-border",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {groups.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            Nothing here yet. Search, chat, read, or compare papers and they&apos;ll show up in your journal.
          </p>
        ) : (
          groups.map((group) => (
            <div key={group.day} className="mb-[34px]">
              <div className="mb-4 font-mono text-[11px] uppercase tracking-[1.4px] text-muted-foreground">
                {group.day}
              </div>
              <div className="relative border-l-[1.5px] border-border/60 pl-[26px]">
                {group.items.map((item) => {
                  const meta = KIND_META[item.kind];
                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      className="relative mb-3 block rounded-[13px] border border-border/50 bg-secondary/[0.18] p-[15px_18px] transition-colors hover:border-brand/35 hover:bg-secondary/40"
                    >
                      <span
                        className={cn(
                          "absolute top-5 -left-[32.5px] size-[11px] rounded-full border-[2.5px] border-background",
                          meta.dot,
                        )}
                      />
                      <div className="mb-1.5 flex items-center gap-2.5">
                        <span
                          className={cn(
                            "rounded-[5px] px-2 py-0.5 font-mono text-[10px] uppercase tracking-[.5px]",
                            meta.tint,
                            meta.color,
                          )}
                        >
                          {item.kind}
                        </span>
                        <span className="font-mono text-[11.5px] text-muted-foreground/70">
                          {new Date(item.timestamp).toLocaleTimeString(undefined, {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <div className="text-[15px] leading-[1.45] text-foreground">{item.title}</div>
                      <div className="mt-1 text-[13px] text-muted-foreground">{item.detail}</div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
