"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { playSound } from "@/lib/shared/sound";

export interface MenuItem {
  href: string;
  title: string;
  blurb: string;
  glyph: string; // big decorative mark on the right
  tone: "brass" | "urgent" | "forest" | "accent" | "ink" | "paper";
}

// Bar colours come from the Studio Desk tokens. "paper" is the quiet style
// for secondary rows.
const TONES: Record<MenuItem["tone"], { bar: string; edge: string; text: string; sub: string; glyph: string }> = {
  brass: { bar: "bg-brass", edge: "bg-accent", text: "text-paper", sub: "text-paper/85", glyph: "text-paper/25" },
  urgent: { bar: "bg-urgent", edge: "bg-ink", text: "text-paper", sub: "text-paper/85", glyph: "text-paper/20" },
  forest: { bar: "bg-forest", edge: "bg-brass", text: "text-paper", sub: "text-paper/85", glyph: "text-paper/20" },
  accent: { bar: "bg-accent", edge: "bg-ink", text: "text-paper", sub: "text-paper/85", glyph: "text-paper/20" },
  ink: { bar: "bg-ink", edge: "bg-brass", text: "text-paper", sub: "text-paper/80", glyph: "text-paper/15" },
  paper: { bar: "bg-paper", edge: "bg-tile-edge", text: "text-ink", sub: "text-ink-soft", glyph: "text-ink/10" },
};

function MenuBar({
  item,
  index,
  size,
  onGo,
  leaving,
}: {
  item: MenuItem;
  index: number;
  size: "lg" | "sm";
  onGo: (href: string) => void;
  leaving: string | null;
}) {
  const tone = TONES[item.tone];
  const reduce = useReducedMotion();
  const isLeaving = leaving === item.href;
  const lg = size === "lg";

  return (
    <motion.a
      href={item.href}
      onClick={(e) => {
        // Let modified clicks (new tab, etc.) behave normally.
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        onGo(item.href);
      }}
      onHoverStart={() => playSound("hover")}
      initial={reduce ? false : { x: -60, opacity: 0 }}
      animate={
        leaving && !isLeaving
          ? { opacity: 0.35, x: 0 }
          : { x: 0, opacity: 1 }
      }
      whileHover={reduce ? undefined : { x: 14 }}
      whileTap={reduce ? undefined : { scaleY: 0.92, x: 20 }}
      transition={{ type: "spring", stiffness: 420, damping: 30, delay: leaving ? 0 : index * 0.06 }}
      className={`group relative flex w-full items-center overflow-hidden rounded-desk shadow-paper ring-brass outline-none focus-visible:ring-2 ${tone.bar} ${
        item.tone === "paper" ? "border-[1.5px] border-tile-edge" : ""
      } ${lg ? "h-24 sm:h-28" : "h-14"}`}
      style={{ clipPath: "polygon(0 0, 100% 0, calc(100% - 18px) 100%, 0 100%)" }}
    >
      {/* coloured edge block that widens on hover */}
      <span
        aria-hidden
        className={`h-full shrink-0 transition-all duration-200 ${tone.edge} ${lg ? "w-3 group-hover:w-6" : "w-2 group-hover:w-4"}`}
      />
      <span className={`flex min-w-0 flex-1 flex-col justify-center ${lg ? "px-5 sm:px-7" : "px-4"}`}>
        <span
          className={`font-serif font-bold tracking-wide uppercase ${tone.text} ${lg ? "text-2xl sm:text-4xl" : "text-lg"}`}
        >
          {item.title}
        </span>
        <span className={`line-clamp-2 sm:truncate ${tone.sub} ${lg ? "text-sm sm:text-base" : "text-xs sm:text-sm"}`}>
          {item.blurb}
        </span>
      </span>
      <span
        aria-hidden
        className={`pointer-events-none select-none pr-8 font-serif font-bold transition-transform duration-300 group-hover:scale-110 ${tone.glyph} ${
          lg ? "text-6xl sm:text-8xl" : "text-3xl"
        }`}
      >
        {item.glyph}
      </span>
      {/* wipe that sweeps across on click, just before navigating */}
      {isLeaving && (
        <motion.span
          aria-hidden
          className="absolute inset-0 bg-paper/40"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          style={{ originX: 0 }}
          transition={{ duration: 0.18, ease: "easeIn" }}
        />
      )}
    </motion.a>
  );
}

export function ModeMenu({ primary, secondary }: { primary: MenuItem[]; secondary: MenuItem[] }) {
  const router = useRouter();
  const [leaving, setLeaving] = useState<string | null>(null);

  const go = (href: string) => {
    if (leaving) return;
    playSound("click");
    setLeaving(href);
    router.prefetch(href);
    window.setTimeout(() => router.push(href), 200);
  };

  return (
    <nav aria-label="Game modes" className="flex w-full flex-col gap-3">
      {primary.map((item, i) => (
        <MenuBar key={item.href} item={item} index={i} size="lg" onGo={go} leaving={leaving} />
      ))}
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {secondary.map((item, i) => (
          <MenuBar key={item.href} item={item} index={primary.length + i} size="sm" onGo={go} leaving={leaving} />
        ))}
      </div>
    </nav>
  );
}
