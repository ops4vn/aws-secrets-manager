import { useEffect, useState } from "react";

const DARK_THEMES = ["dark", "dracula", "dim"];

const checkIsDarkTheme = (): boolean => {
  if (typeof document === "undefined") return false;
  const theme = document.documentElement?.dataset?.theme;
  if (!theme) return false;
  
  // Check if theme is in dark themes list
  if (DARK_THEMES.includes(theme)) return true;
  
  // Fallback: check color-scheme CSS property
  const computedStyle = window.getComputedStyle(document.documentElement);
  const colorScheme = computedStyle.colorScheme;
  return colorScheme === "dark";
};

export function useDarkTheme(): boolean {
  const [isDarkTheme, setIsDarkTheme] = useState<boolean>(checkIsDarkTheme());

  useEffect(() => {
    if (typeof document === "undefined") return;
    const el = document.documentElement;
    const handler = () => {
      setIsDarkTheme(checkIsDarkTheme());
    };
    const observer = new MutationObserver(handler);
    observer.observe(el, { attributes: true, attributeFilter: ["data-theme"] });
    handler();
    return () => observer.disconnect();
  }, []);

  return isDarkTheme;
}

