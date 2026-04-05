"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { safeGet, safeSet } from "@/lib/safe-storage";

type Theme = "dark" | "light";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggle: () => void;
}

export const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  setTheme: () => {},
  toggle: () => {},
});

export function useThemeProvider() {
  const [theme, setThemeState] = useState<Theme>("dark");

  useEffect(() => {
    const stored = safeGet("maven-theme") as Theme | null;
    const initial = stored ?? "dark";
    setThemeState(initial);
    document.documentElement.setAttribute("data-theme", initial);
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    document.documentElement.setAttribute("data-theme", t);
    safeSet("maven-theme", t);
  }, []);

  const toggle = useCallback(() => {
    setThemeState(prev => {
      const next = prev === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      safeSet("maven-theme", next);
      return next;
    });
  }, []);

  return { theme, setTheme, toggle };
}

export function useTheme() {
  return useContext(ThemeContext);
}
