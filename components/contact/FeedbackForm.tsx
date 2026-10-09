"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  FEEDBACK_KINDS,
  MAX_MESSAGE,
  MAX_CONTACT,
  type FeedbackKind,
} from "@/lib/feedback/validate";

const KIND_LABELS: Record<FeedbackKind, string> = {
  bug: "Bug",
  idea: "Idea",
  other: "Other",
};

export function FeedbackForm() {
  const [kind, setKind] = useState<FeedbackKind>("bug");
  const [message, setMessage] = useState("");
  const [contact, setContact] = useState("");
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleReset = () => {
    setKind("bug");
    setMessage("");
    setContact("");
    setWebsite("");
    setStatus("idle");
    setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (status === "sending" || message.trim().length === 0) return;

    setStatus("sending");
    setErrorMessage(null);

    let page = "";
    try {
      if (document.referrer) {
        page = new URL(document.referrer).pathname;
      }
    } catch {
      page = "";
    }

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          kind,
          message,
          contact,
          website,
          page,
        }),
      });

      const data = (await res.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;

      if (res.ok && data?.ok) {
        setStatus("sent");
      } else {
        setStatus("error");
        setErrorMessage(
          data?.error || "Couldn't send — please email instead.",
        );
      }
    } catch {
      setStatus("error");
      setErrorMessage("Couldn't send — please email instead.");
    }
  };

  if (status === "sent") {
    return (
      <div className="flex flex-col items-start gap-4">
        <p className="font-serif text-xl font-semibold text-ink">
          Thanks — got it.
        </p>
        <Button variant="secondary" onClick={handleReset}>
          Send another
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <span
          id="kind-label"
          className="text-xs font-bold tracking-[0.14em] text-accent uppercase"
        >
          Kind
        </span>
        <div
          role="radiogroup"
          aria-labelledby="kind-label"
          className="flex flex-wrap gap-2"
        >
          {FEEDBACK_KINDS.map((k) => {
            const isSelected = kind === k;
            return (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => setKind(k)}
                className={`rounded-desk border-[1.5px] px-3 py-1 text-sm font-bold transition ${
                  isSelected
                    ? "border-brass bg-dial text-ink"
                    : "border-tile-edge bg-paper text-ink-soft hover:text-ink"
                }`}
              >
                {KIND_LABELS[k]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <label
            htmlFor="feedback-message"
            className="text-xs font-bold tracking-[0.14em] text-accent uppercase"
          >
            Message
          </label>
          <span className="text-xs text-ink-soft">
            {message.length}/{MAX_MESSAGE}
          </span>
        </div>
        <textarea
          id="feedback-message"
          name="message"
          rows={5}
          maxLength={MAX_MESSAGE}
          required
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full rounded-desk border-[1.5px] border-tile-edge bg-paper px-3 py-2 text-base text-ink placeholder:text-ink-soft/60 focus:border-brass focus:outline-none"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label
          htmlFor="feedback-contact"
          className="text-xs font-bold tracking-[0.14em] text-accent uppercase"
        >
          Email or handle (optional, if you&apos;d like a reply)
        </label>
        <input
          id="feedback-contact"
          name="contact"
          type="text"
          maxLength={MAX_CONTACT}
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          className="w-full rounded-desk border-[1.5px] border-tile-edge bg-paper px-3 py-2 text-base text-ink placeholder:text-ink-soft/60 focus:border-brass focus:outline-none"
        />
      </div>

      <div className="hidden" aria-hidden="true">
        <label htmlFor="feedback-website">Website</label>
        <input
          id="feedback-website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>

      {status === "error" && errorMessage && (
        <p role="alert" className="text-sm font-bold text-urgent">
          {errorMessage}
        </p>
      )}

      <div>
        <Button
          type="submit"
          variant="primary"
          disabled={status === "sending" || message.trim().length === 0}
        >
          {status === "sending" ? "Sending…" : "Send feedback"}
        </Button>
      </div>
    </form>
  );
}
