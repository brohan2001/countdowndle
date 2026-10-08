import {
  DAILY_STORAGE_KEY,
  DailyHistory,
  parseHistory,
  emptyHistory,
} from "./storage";

// A tiny external store over localStorage for useSyncExternalStore. If the
// browser blocks storage the history lives in memory for the session, so the
// UI still works (it just won't persist).
let memoryRaw: string | null = null;
let useMemory = false;
const listeners = new Set<() => void>();

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// Snapshot is the raw string: stable between calls when nothing changed.
export function getRawSnapshot(): string | null {
  if (useMemory) return memoryRaw;
  try {
    return window.localStorage.getItem(DAILY_STORAGE_KEY);
  } catch {
    useMemory = true;
    return memoryRaw;
  }
}

export function getServerRawSnapshot(): string | null {
  return null;
}

export function historyFromRaw(raw: string | null): DailyHistory {
  return raw === null ? emptyHistory() : parseHistory(raw);
}

export function updateHistory(
  update: (history: DailyHistory) => DailyHistory,
): void {
  const current = historyFromRaw(getRawSnapshot());
  const next = update(current);
  if (next === current) return;
  const raw = JSON.stringify(next);
  if (!useMemory) {
    try {
      window.localStorage.setItem(DAILY_STORAGE_KEY, raw);
    } catch {
      useMemory = true;
    }
  }
  if (useMemory) memoryRaw = raw;
  listeners.forEach((listener) => listener());
}
