import { AuthPanel } from "@/components/auth/AuthPanel";

export default async function AccountPage({ searchParams }: PageProps<"/account">) {
  const { next } = await searchParams;
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col items-center gap-6 px-4 py-8">
      <h1 className="font-serif text-3xl font-semibold text-ink">Your account</h1>
      <AuthPanel next={typeof next === "string" ? next : undefined} />
    </main>
  );
}
