"use client";

import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";

const inputClass =
  "w-full rounded-desk border-[1.5px] border-tile-edge bg-paper px-3 py-2 font-sans text-base text-ink placeholder:text-ink-soft/60 focus:border-brass focus:outline-none";

function Field({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex w-full flex-col gap-1">
      <span className="text-xs font-bold tracking-[0.14em] text-accent uppercase">
        {label}
      </span>
      <input className={inputClass} {...props} />
    </label>
  );
}

function ErrorLine({ message }: { message: string | null }) {
  return message ? (
    <p role="alert" className="text-sm font-bold text-urgent">
      {message}
    </p>
  ) : null;
}

export function AuthPanel() {
  if (!isSupabaseConfigured()) {
    return (
      <Panel className="w-full max-w-md text-center">
        <p className="font-serif text-xl font-semibold text-ink">
          Online play isn&apos;t switched on here
        </p>
        <p className="mt-2 text-sm text-ink-soft">
          Solo games and the Daily Countdown work without an account.
        </p>
      </Panel>
    );
  }
  return <ConfiguredAuthPanel />;
}

function ConfiguredAuthPanel() {
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setUser(data.user);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  const run = async (action: () => Promise<{ error: { message: string } | null }>) => {
    setBusy(true);
    setError(null);
    const { error: err } = await action();
    if (err) setError(err.message);
    setBusy(false);
  };

  const trimmedName = displayName.trim().slice(0, 24);

  if (loading) {
    return <p className="text-ink-soft">Checking your account…</p>;
  }

  // ---- signed in, anonymous: offer to save progress ----
  if (user?.is_anonymous) {
    const name = (user.user_metadata?.display_name as string | undefined) ?? "Player";
    return (
      <Panel className="flex w-full max-w-md flex-col gap-4">
        <h2 className="font-serif text-2xl font-semibold text-ink">
          Playing as {name}
        </h2>
        <p className="text-sm text-ink-soft">
          You&apos;re a guest. Add an email and password to keep your history on
          any device — you&apos;ll stay the same player.
        </p>
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => supabase.auth.updateUser({ email, password }));
          }}
        >
          <Field label="Email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Field label="Password" type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <ErrorLine message={error} />
          <Button type="submit" disabled={busy}>
            Save your progress
          </Button>
        </form>
        <Button variant="secondary" disabled={busy} onClick={() => run(() => supabase.auth.signOut())}>
          Sign out
        </Button>
      </Panel>
    );
  }

  // ---- signed in with an account ----
  if (user) {
    return (
      <Panel className="flex w-full max-w-md flex-col gap-4">
        <h2 className="font-serif text-2xl font-semibold text-ink">Signed in</h2>
        <p className="text-sm text-ink-soft">{user.email}</p>
        <Button variant="secondary" disabled={busy} onClick={() => run(() => supabase.auth.signOut())}>
          Sign out
        </Button>
      </Panel>
    );
  }

  // ---- signed out ----
  return (
    <div className="flex w-full max-w-md flex-col gap-6">
      <Panel className="flex flex-col gap-3">
        <h2 className="font-serif text-2xl font-semibold text-ink">
          Play as a guest
        </h2>
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            run(() =>
              supabase.auth.signInAnonymously({
                options: { data: { display_name: trimmedName } },
              }),
            );
          }}
        >
          <Field label="Display name" maxLength={24} placeholder="Your display name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          <Button type="submit" disabled={busy}>
            Play anonymously
          </Button>
        </form>
      </Panel>

      <Panel className="flex flex-col gap-3">
        <h2 className="font-serif text-2xl font-semibold text-ink">
          {mode === "signin" ? "Sign in" : "Create an account"}
        </h2>
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            run(() =>
              mode === "signin"
                ? supabase.auth.signInWithPassword({ email, password })
                : supabase.auth.signUp({
                    email,
                    password,
                    options: { data: { display_name: trimmedName } },
                  }),
            );
          }}
        >
          {mode === "signup" && (
            <Field label="Display name" maxLength={24} value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          )}
          <Field label="Email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Field label="Password" type="password" required minLength={8} autoComplete={mode === "signin" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} />
          <ErrorLine message={error} />
          <Button type="submit" disabled={busy}>
            {mode === "signin" ? "Sign in" : "Sign up"}
          </Button>
        </form>
        <button
          type="button"
          className="text-sm font-bold text-accent underline"
          onClick={() => {
            setError(null);
            setMode(mode === "signin" ? "signup" : "signin");
          }}
        >
          {mode === "signin" ? "Need an account? Sign up" : "Have an account? Sign in"}
        </button>
      </Panel>
    </div>
  );
}
