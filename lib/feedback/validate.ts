// Pure validation for the feedback form, shared by the route and its tests.
export const FEEDBACK_KINDS = ["bug", "idea", "other"] as const;
export type FeedbackKind = (typeof FEEDBACK_KINDS)[number];

export const MAX_MESSAGE = 2000;
export const MAX_CONTACT = 200;
export const RATE_LIMIT_PER_HOUR = 5;

export interface FeedbackInput {
  kind: FeedbackKind;
  message: string;
  contact: string | null;
  page: string | null;
}

export type FeedbackParse =
  | { ok: true; value: FeedbackInput }
  | { ok: false; error: string; spam?: true };

export function parseFeedback(body: Record<string, unknown>): FeedbackParse {
  // Honeypot: a hidden field real people never fill in.
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return { ok: false, error: "Rejected", spam: true };
  }
  const kind = body.kind;
  if (typeof kind !== "string" || !(FEEDBACK_KINDS as readonly string[]).includes(kind)) {
    return { ok: false, error: "Pick bug, idea or other" };
  }
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (message.length === 0) return { ok: false, error: "Write a message first" };
  if (message.length > MAX_MESSAGE) return { ok: false, error: `Keep it under ${MAX_MESSAGE} characters` };

  const rawContact = typeof body.contact === "string" ? body.contact.trim() : "";
  if (rawContact.length > MAX_CONTACT) return { ok: false, error: "Contact is too long" };

  const rawPage = typeof body.page === "string" ? body.page.trim().slice(0, 200) : "";
  return {
    ok: true,
    value: {
      kind: kind as FeedbackKind,
      message,
      contact: rawContact || null,
      page: rawPage || null,
    },
  };
}
