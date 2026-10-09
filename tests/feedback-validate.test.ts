import { describe, it, expect } from "vitest";
import { MAX_MESSAGE, parseFeedback } from "@/lib/feedback/validate";

describe("parseFeedback", () => {
  it("accepts a trimmed message and normalises optional fields", () => {
    expect(parseFeedback({ kind: "bug", message: "  timer froze  ", contact: " ", page: "/numbers" })).toEqual({
      ok: true,
      value: { kind: "bug", message: "timer froze", contact: null, page: "/numbers" },
    });
  });
  it("rejects unknown kinds, empty and over-long messages, long contacts", () => {
    expect(parseFeedback({ kind: "spam", message: "x" }).ok).toBe(false);
    expect(parseFeedback({ kind: "idea", message: "   " }).ok).toBe(false);
    expect(parseFeedback({ kind: "idea", message: "x".repeat(MAX_MESSAGE + 1) }).ok).toBe(false);
    expect(parseFeedback({ kind: "idea", message: "hi", contact: "x".repeat(201) }).ok).toBe(false);
    expect(parseFeedback({ kind: 3, message: ["no"] }).ok).toBe(false);
  });
  it("flags the honeypot as spam", () => {
    expect(parseFeedback({ kind: "bug", message: "hi", website: "http://spam" })).toMatchObject({ ok: false, spam: true });
  });
});
