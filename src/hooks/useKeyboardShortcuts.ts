"use client";

import { useEffect } from "react";

// ---------------------------------------------------------------------------
// useKeyboardShortcuts — Keyboard bindings for game actions
// ---------------------------------------------------------------------------

interface KeyboardHandlers {
  onMove: () => void;
  onAttack: () => void;
  onRepair: () => void;
  onWait: () => void;
  onEndTurn: () => void;
  onEscape: () => void;
  onCycleUnit: () => void;
  enabled: boolean; // only active during player phase
}

export function useKeyboardShortcuts(handlers: KeyboardHandlers): void {
  useEffect(() => {
    if (!handlers.enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture when typing in an input/textarea
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      // Ignore if composing (IME input)
      if (e.isComposing) return;

      const key = e.key.toLowerCase();

      switch (key) {
        case "q":
        case "m":
          e.preventDefault();
          handlers.onMove();
          break;

        case "w":
        case "a":
          e.preventDefault();
          handlers.onAttack();
          break;

        case "e":
          e.preventDefault();
          handlers.onRepair();
          break;

        case "r":
          e.preventDefault();
          handlers.onWait();
          break;

        case " ": // Space
        case "enter":
          e.preventDefault();
          handlers.onEndTurn();
          break;

        case "escape":
          e.preventDefault();
          handlers.onEscape();
          break;

        case "tab":
          e.preventDefault();
          handlers.onCycleUnit();
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handlers]);
}
