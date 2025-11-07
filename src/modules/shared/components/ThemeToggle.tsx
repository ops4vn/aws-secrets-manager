import { useEffect, useState } from "react";
import { Palette } from "lucide-react";
import { api } from "../../services/tauriApi";

const THEMES = ["light", "dark", "dracula", "dim", "cmyk"] as const;
type Theme = (typeof THEMES)[number];

export function ThemeToggle() {
  const [currentTheme, setCurrentTheme] = useState<Theme>("light");

  useEffect(() => {
    const loadTheme = async () => {
      const savedTheme = await api.loadTheme();
      if (savedTheme && THEMES.includes(savedTheme as Theme)) {
        setCurrentTheme(savedTheme as Theme);
        document.documentElement.setAttribute("data-theme", savedTheme);
      } else {
        // Default to light if no theme saved
        document.documentElement.setAttribute("data-theme", "light");
      }
    };
    loadTheme();
  }, []);

  const cycleTheme = async () => {
    const currentIndex = THEMES.indexOf(currentTheme);
    const nextIndex = (currentIndex + 1) % THEMES.length;
    const nextTheme = THEMES[nextIndex];

    document.documentElement.setAttribute("data-theme", nextTheme);
    setCurrentTheme(nextTheme);
    await api.saveTheme(nextTheme);
  };

  return (
    <button
      className="btn btn-ghost btn-sm btn-square h-8 w-8 min-h-0"
      onClick={cycleTheme}
      title={`Current theme: ${currentTheme}. Click to cycle themes`}
      aria-label="Cycle theme"
    >
      <Palette className="h-4 w-4" />
    </button>
  );
}

