import { Tile } from "@/components/ui/Tile";

export function ScrambleBoard({ letters }: { letters: string }) {
  return (
    <div className="flex flex-wrap justify-center gap-2" aria-label="Scrambled letters">
      {[...letters].map((letter, index) => (
        <Tile key={`${index}-${letter}`} index={index}>
          {letter}
        </Tile>
      ))}
    </div>
  );
}
