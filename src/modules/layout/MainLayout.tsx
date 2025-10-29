import { Outlet } from "react-router-dom";
import { List, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../services/tauriApi";
import { useUiStore } from "../store/useUiStore";

export function MainLayout() {
  const [theme, setTheme] = useState<string | null>(null);
  useEffect(() => {
    (async () => {
      const t = await api.loadTheme();
      if (t) {
        document.documentElement.setAttribute("data-theme", t);
        setTheme(t);
      }
    })();
  }, []);
  const toggleTheme = async (checked: boolean) => {
    const next = checked ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", next);
    setTheme(next);
    await api.saveTheme(next);
  };
  return (
    <div className="flex flex-col min-h-screen bg-base-200 text-base-content">
      <div className="navbar bg-base-100 border-b border-base-300 px-4">
        <div
          className="flex-1 cursor-grab flex items-center gap-2"
          data-tauri-drag-region
        >
          <SidebarToggleButton />
          <div className="btn btn-ghost text-xl">SecManager</div>
        </div>
        <div className="flex-none gap-2">
          <label className="swap swap-rotate">
            <input
              type="checkbox"
              className="theme-controller"
              value="dark"
              checked={theme === "dark"}
              onChange={(e) => toggleTheme(e.target.checked)}
            />
            <Sun className="swap-off h-6 w-6" />
            <Moon className="swap-on h-6 w-6" />
          </label>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <Outlet />
      </div>
    </div>
  );
}

function SidebarToggleButton() {
  const { leftSidebarOpen, toggleLeftSidebar } = useUiStore();
  return (
    <button
      className={`btn btn-ghost btn-sm ${leftSidebarOpen ? "" : "opacity-80"}`}
      onClick={(e) => {
        e.preventDefault();
        toggleLeftSidebar();
      }}
      title={leftSidebarOpen ? "Hide sidebar" : "Show sidebar"}
      aria-label="Toggle sidebar"
    >
      <List className="h-5 w-5" />
    </button>
  );
}
