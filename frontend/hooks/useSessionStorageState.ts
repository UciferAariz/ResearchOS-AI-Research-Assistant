"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Like useState, but mirrored to sessionStorage so the value survives a
 * client-side route change (Next.js App Router unmounts the previous route's
 * component tree on navigation) and a full page refresh, while still
 * clearing when the tab/window closes — sessionStorage's native lifetime —
 * instead of lingering indefinitely like localStorage would.
 *
 * Hydration happens in an effect (not lazy useState init) so the server-
 * rendered markup always matches the initial client render; the stored value
 * is applied a tick later, right before the write-back effect below would
 * otherwise clobber it with `initialValue`.
 */
export function useSessionStorageState<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(initialValue);
  const hydrated = useRef(false);

  useEffect(() => {
    try {
      const stored = window.sessionStorage.getItem(key);
      if (stored !== null) setValue(JSON.parse(stored) as T);
    } catch {
      // malformed or unavailable storage — fall back to initialValue
    }
    hydrated.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    if (!hydrated.current) return;
    try {
      window.sessionStorage.setItem(key, JSON.stringify(value));
    } catch {
      // storage unavailable (private mode quota, etc.) — state still works
      // in-memory for this mount, it just won't survive a refresh.
    }
  }, [key, value]);

  return [value, setValue] as const;
}
