"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useLeaveGuardMessage } from "@/lib/shared/leaveGuard";
import { isMuted, playSound, setMuted, subscribeMuted } from "@/lib/shared/sound";
import { Button } from "@/components/ui/Button";
import { GITHUB_REPO, issueUrl } from "@/lib/shared/site";

function MuteToggle() {
  const muted = useSyncExternalStore(subscribeMuted, isMuted, () => false);
  return (
    <button
      type="button"
      onClick={() => {
        setMuted(!muted);
        if (muted) playSound("confirm");
      }}
      aria-pressed={muted}
      aria-label={muted ? "Turn sound on" : "Turn sound off"}
      title={muted ? "Sound off" : "Sound on"}
      className="rounded-desk border-[1.5px] border-tile-edge bg-paper px-2 py-1 text-sm font-bold whitespace-nowrap text-ink-soft transition hover:border-brass hover:text-ink"
    >
      <span aria-hidden className={muted ? "line-through opacity-60" : ""}>♪</span>
      <span className="hidden sm:inline"> {muted ? "Off" : "On"}</span>
    </button>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const guard = useLeaveGuardMessage();
  const [confirming, setConfirming] = useState(false);
  const isHome = pathname === "/";

  return (
    <header className="sticky top-0 z-20 border-b border-dashed border-tile-edge bg-cream/90 backdrop-blur">
      <div className="mx-auto grid h-14 w-full max-w-3xl grid-cols-[1fr_auto_1fr] items-center gap-2 px-4">
        <div className="flex items-center">
          {!isHome && (
            <Link
              href="/"
              onClick={(e) => {
                if (guard) {
                  e.preventDefault();
                  setConfirming(true);
                }
              }}
              className="group flex items-center gap-1 rounded-desk px-2 py-1 text-sm font-bold text-ink-soft transition hover:bg-tab hover:text-ink"
            >
              <span aria-hidden className="transition group-hover:-translate-x-0.5">←</span>
              {guard ? "Quit" : "Home"}
            </Link>
          )}
        </div>
        <div className="text-center">
          {!isHome && (
            <Link href="/" className="font-serif text-lg font-semibold whitespace-nowrap text-ink sm:text-xl">
              Countdowndle
            </Link>
          )}
        </div>
        <div className="flex items-center justify-end gap-2">
          <MuteToggle />
          <Link
            href="/account"
            className="rounded-desk px-2 py-1 text-sm font-bold text-ink-soft transition hover:bg-tab hover:text-ink"
          >
            Account
          </Link>
        </div>
      </div>

      {confirming && guard && (
        <div role="alertdialog" aria-label="Leave this page?" className="border-t border-dashed border-tile-edge bg-paper">
          <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-3 px-4 py-3">
            <span className="text-sm font-bold text-ink">{guard}</span>
            <Button
              variant="danger"
              onClick={() => {
                setConfirming(false);
                router.push("/");
              }}
            >
              Leave
            </Button>
            <Button variant="secondary" onClick={() => setConfirming(false)}>
              Stay
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-dashed border-tile-edge">
      <nav className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-x-5 gap-y-1 px-4 py-4 text-sm text-ink-soft">
        <Link href="/dictionary" className="hover:text-ink hover:underline">Dictionary</Link>
        <Link href="/contact" className="hover:text-ink hover:underline">Contact &amp; feedback</Link>
        <a href={issueUrl("bug_report.yml")} className="hover:text-ink hover:underline" target="_blank" rel="noreferrer">
          Report a bug
        </a>
        <a href={GITHUB_REPO} className="hover:text-ink hover:underline" target="_blank" rel="noreferrer">
          GitHub
        </a>
      </nav>
    </footer>
  );
}
