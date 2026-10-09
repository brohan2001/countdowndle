"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";

// One-step guest sign-in, usable inline wherever online play needs a session
// (so nobody has to leave the page they were on). The profile row is created
// by the database trigger; an empty name falls back to "Player xxxx".
export function GuestSignIn({
  onSignedIn,
  cta = "Play as guest",
}: {
  onSignedIn?: () => void;
  cta?: string;
}) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="flex w-full flex-col items-center gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        const { error: err } = await createClient().auth.signInAnonymously({
          options: { data: { display_name: name.trim().slice(0, 24) } },
        });
        setBusy(false);
        if (err) {
          setError(err.message);
          return;
        }
        onSignedIn?.();
      }}
    >
      <div className="flex w-full gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={24}
          placeholder="Display name (optional)"
          aria-label="Display name"
          autoComplete="nickname"
          className="min-w-0 flex-1 rounded-desk border-[1.5px] border-tile-edge bg-paper px-3 py-2 text-base text-ink placeholder:text-ink-soft/60 focus:border-brass focus:outline-none"
        />
        <Button type="submit" disabled={busy}>
          {busy ? "Joining…" : cta}
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm font-bold text-urgent">
          {error}
        </p>
      )}
    </form>
  );
}
