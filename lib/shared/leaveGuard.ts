"use client";

import { useEffect, useSyncExternalStore } from "react";

// A page in the middle of something (a timed round, a duel) registers a
// message here; the site header's Home control then asks before leaving.
let message: string | null = null;
const listeners = new Set<() => void>();

function set(next: string | null) {
  message = next;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useLeaveGuard(active: boolean, text: string): void {
  useEffect(() => {
    if (!active) return;
    set(text);
    return () => set(null);
  }, [active, text]);
}

export function useLeaveGuardMessage(): string | null {
  return useSyncExternalStore(
    subscribe,
    () => message,
    () => null,
  );
}
