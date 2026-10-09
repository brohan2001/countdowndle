import type { Metadata } from "next";
import { Panel } from "@/components/ui/Panel";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { FeedbackForm } from "@/components/contact/FeedbackForm";
import { CONTACT_EMAIL, GITHUB_REPO, issueUrl } from "@/lib/shared/site";

export const metadata: Metadata = {
  title: "Contact & feedback — Countdowndle",
};

export default function ContactPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col items-center gap-6 px-4 py-8">
      <h1 className="font-serif text-3xl font-semibold text-ink">
        Contact &amp; feedback
      </h1>
      <p className="text-center text-ink-soft">
        Found a bug, want a feature, or just want to say hello? Pick whichever is easiest.
      </p>

      <div className="grid w-full gap-4 sm:grid-cols-3">
        <Panel className="flex flex-col gap-3">
          <h2 className="font-serif text-xl font-semibold text-ink">
            Report a bug
          </h2>
          <p className="text-sm text-ink-soft">
            Opens a GitHub issue with a short template. Screenshots help.
          </p>
          <div className="mt-auto pt-1">
            <ButtonLink
              href={issueUrl("bug_report.yml")}
              target="_blank"
              rel="noreferrer"
              className="w-full"
            >
              Report a bug
            </ButtonLink>
          </div>
        </Panel>

        <Panel className="flex flex-col gap-3">
          <h2 className="font-serif text-xl font-semibold text-ink">
            Request a feature
          </h2>
          <p className="text-sm text-ink-soft">
            Ideas are public on GitHub so others can upvote them.
          </p>
          <div className="mt-auto pt-1">
            <ButtonLink
              href={issueUrl("feature_request.yml")}
              target="_blank"
              rel="noreferrer"
              className="w-full"
            >
              Suggest it
            </ButtonLink>
          </div>
        </Panel>

        <Panel className="flex flex-col gap-3">
          <h2 className="font-serif text-xl font-semibold text-ink">
            Email
          </h2>
          <p className="text-sm text-ink-soft">
            Prefer private? Write to me directly.
          </p>
          <p className="break-all text-xs text-ink-soft">
            {CONTACT_EMAIL}
          </p>
          <div className="mt-auto pt-1">
            <ButtonLink
              href={`mailto:${CONTACT_EMAIL}?subject=Countdowndle%20feedback`}
              className="w-full"
            >
              Email
            </ButtonLink>
          </div>
        </Panel>
      </div>

      <Panel className="flex w-full flex-col gap-4">
        <h2 className="font-serif text-xl font-semibold text-ink">
          Send feedback here
        </h2>
        <FeedbackForm />
      </Panel>

      <p className="text-xs text-ink-soft">
        Source code:{" "}
        <a
          href={GITHUB_REPO}
          target="_blank"
          rel="noreferrer"
          className="text-accent underline"
        >
          {GITHUB_REPO}
        </a>
      </p>
    </main>
  );
}
