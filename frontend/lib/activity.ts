export type ActivityKind = "search" | "chat" | "compare" | "read";

export interface ActivityItem {
  id: string;
  kind: ActivityKind;
  title: string;
  detail: string;
  href: string;
  timestamp: number;
}

const STORAGE_KEY = "researchos:activity";
const MAX_ITEMS = 200;

function readAll(): ActivityItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ActivityItem[];
  } catch {
    return [];
  }
}

function writeAll(items: ActivityItem[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)));
  } catch {
    // storage unavailable — activity just won't persist this session
  }
}

export function recordActivity(entry: Omit<ActivityItem, "id" | "timestamp">) {
  if (typeof window === "undefined") return;
  const item: ActivityItem = {
    ...entry,
    id: `${entry.kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
  };
  writeAll([item, ...readAll()]);
}

export function getActivity(): ActivityItem[] {
  return readAll().sort((a, b) => b.timestamp - a.timestamp);
}

export function getActivityByKind(kind: ActivityKind, limit = 5): ActivityItem[] {
  return getActivity()
    .filter((item) => item.kind === kind)
    .slice(0, limit);
}

export function getLastReadPaper(): ActivityItem | null {
  return getActivityByKind("read", 1)[0] ?? null;
}

export interface ActivityGroup {
  day: string;
  items: ActivityItem[];
}

function dayLabel(timestamp: number): string {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  if (sameDay(date, today)) return "Today";
  if (sameDay(date, yesterday)) return "Yesterday";
  return date.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short" });
}

export function groupActivityByDay(items: ActivityItem[]): ActivityGroup[] {
  const groups = new Map<string, ActivityItem[]>();
  for (const item of items) {
    const label = dayLabel(item.timestamp);
    const list = groups.get(label) ?? [];
    list.push(item);
    groups.set(label, list);
  }
  return Array.from(groups.entries()).map(([day, groupItems]) => ({ day, items: groupItems }));
}
