import type { ReactNode } from "react";
import { playSound } from "@/lib/shared/sound";

export interface TileProps {
  children: ReactNode;
  index?: number; // position on the board; alternates the hand-placed tilt
  selected?: boolean;
  disabled?: boolean;
  empty?: boolean; // an unfilled slot
  onClick?: () => void;
  ariaLabel?: string;
  className?: string;
}

// Odd positions lean one way, even the other, like tiles placed by hand.
function tilt(index: number): string {
  return index % 2 === 0 ? "rotate(-1.4deg)" : "rotate(1.2deg)";
}

export function Tile({
  children,
  index = 0,
  selected = false,
  disabled = false,
  empty = false,
  onClick,
  ariaLabel,
  className = "",
}: TileProps) {
  const base =
    "flex h-14 min-w-14 items-center justify-center rounded-desk border-[1.5px] px-2 font-serif text-2xl font-semibold uppercase select-none sm:h-16 sm:min-w-16 sm:text-3xl";
  const look = empty
    ? "border-dashed border-tile-edge bg-transparent text-transparent"
    : selected
      ? "border-brass bg-paper text-ink shadow-paper ring-2 ring-brass"
      : "border-tile-edge bg-paper text-ink shadow-paper";
  const style = { transform: tilt(index) };

  if (!onClick) {
    return (
      <div className={`${base} ${look} ${className}`} style={style}>
        {children}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        playSound("tile");
        onClick();
      }}
      disabled={disabled}
      aria-pressed={selected}
      aria-label={ariaLabel}
      style={style}
      className={`${base} ${look} cursor-pointer transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 ${className}`}
    >
      {children}
    </button>
  );
}
