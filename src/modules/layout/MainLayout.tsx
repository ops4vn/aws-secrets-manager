import { Outlet } from "react-router-dom";
import { Menu, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../services/tauriApi";
import { useUiStore } from "../store/useUiStore";
import { platform } from "@tauri-apps/plugin-os";

export function MainLayout() {
  const [theme, setTheme] = useState<string | null>(null);

  const toggleTheme = async (checked: boolean) => {
    const next = checked ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", next);
    setTheme(next);
    await api.saveTheme(next);
  };

  const isMac = platform() === "macos";

  console.log(isMac);

  useEffect(() => {
    (async () => {
      const t = await api.loadTheme();
      if (t) {
        document.documentElement.setAttribute("data-theme", t);
        setTheme(t);
      }
    })();
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-base-200 text-base-content">
      <div className="navbar bg-base-100 border-b border-base-300 px-2 h-10 min-h-10">
        <div
          className={`flex-1 cursor-grab flex items-center gap-1 ${isMac ? "ms-20" : ""} select-none`}
          data-tauri-drag-region
        >
          <SidebarToggleButton />
          <div className="font-semibold text-sm px-2 py-1 h-auto min-h-0">
            <span className="text-primary">Sec</span>
            <span className="text-base-content">Manager</span>
          </div>
        </div>
        <div className="flex-none gap-1">
          <label className="swap swap-rotate btn btn-ghost btn-sm btn-square h-8 w-8 min-h-0">
            <input
              type="checkbox"
              className="theme-controller"
              value="dark"
              checked={theme === "dark"}
              onChange={(e) => toggleTheme(e.target.checked)}
            />
            <Sun className="swap-off h-4 w-4" />
            <Moon className="swap-on h-4 w-4" />
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
      className={`btn btn-ghost btn-sm btn-square h-8 w-8 min-h-0 p-0 ${
        leftSidebarOpen ? "" : "opacity-80"
      }`}
      onClick={(e) => {
        e.preventDefault();
        toggleLeftSidebar();
      }}
      title={leftSidebarOpen ? "Hide sidebar" : "Show sidebar"}
      aria-label="Toggle sidebar"
    >
      <Menu className="h-4 w-4" />
    </button>
  );
}
