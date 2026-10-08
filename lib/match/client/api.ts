export interface ActionResult<T = Record<string, unknown>> {
  ok: boolean;
  status: number;
  data: T & { error?: string };
}

async function post<T>(path: string, body?: unknown): Promise<ActionResult<T>> {
  try {
    const res = await fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body ?? {}),
    });
    const data = (await res.json().catch(() => ({}))) as T & { error?: string };
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: { error: "Network error" } as T & { error?: string } };
  }
}

export const createRoom = () => post<{ matchId: string; code: string }>("/api/match");
export const joinRoom = (code: string) => post<{ matchId: string }>("/api/match/join", { code });
export const matchAction = <T = Record<string, unknown>>(matchId: string, action: string, body?: unknown) =>
  post<T>(`/api/match/${matchId}/${action}`, body);

// Estimate (server clock - client clock) in ms using the request midpoint.
// Several samples, keeping the one with the shortest round trip.
export async function measureClockOffset(samples = 3): Promise<number> {
  let best: { rtt: number; offset: number } | null = null;
  for (let i = 0; i < samples; i++) {
    const t0 = Date.now();
    try {
      const res = await fetch("/api/time", { cache: "no-store" });
      const { now } = (await res.json()) as { now: number };
      const t1 = Date.now();
      const rtt = t1 - t0;
      const offset = now - (t0 + rtt / 2);
      if (!best || rtt < best.rtt) best = { rtt, offset };
    } catch {
      // ignore a failed sample
    }
  }
  return best ? Math.round(best.offset) : 0;
}
