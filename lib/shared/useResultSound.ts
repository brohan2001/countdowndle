"use client";

import { useEffect } from "react";
import { playSound } from "./sound";

// Plays success/fail once when a result appears (null = no result yet).
export function useResultSound(won: boolean | null): void {
  useEffect(() => {
    if (won !== null) playSound(won ? "success" : "fail");
  }, [won]);
}
