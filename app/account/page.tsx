import { AuthPanel } from "@/components/auth/AuthPanel";

export default function AccountPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col items-center gap-6 px-4 py-8">
      <h1 className="font-serif text-3xl font-semibold text-ink">Your account</h1>
      <AuthPanel />
    </main>
  );
}
