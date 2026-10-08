import { DuelRoom } from "@/components/duel/DuelRoom";

export default async function DuelRoomPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col items-center gap-6 px-4 py-8">
      <h1 className="font-serif text-3xl font-semibold text-ink">Duel</h1>
      <DuelRoom code={code.toUpperCase()} />
    </main>
  );
}
