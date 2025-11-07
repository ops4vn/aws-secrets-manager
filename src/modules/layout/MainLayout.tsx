import { Outlet } from "react-router-dom";
import { Menu } from "lucide-react";
import { useEffect, useState } from "react";
import { useUiStore } from "../store/useUiStore";
import { platform } from "@tauri-apps/plugin-os";
import { ThemeToggle } from "../shared/components/ThemeToggle";

export function MainLayout() {
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    const checkPlatform = async () => {
      const platformName = await platform();
      setIsMac(platformName === "macos");
    };
    checkPlatform();
  }, []);

  return (
    <div className="flex flex-col min-h-screen min-w-screen bg-base-300 text-base-content overflow-hidden">
      <div className="navbar bg-base-100 border-b border-base-300 px-2 h-10 min-h-10">
        <div
          className={`flex-1 cursor-grab flex items-center gap-1 ${
            isMac ? "ms-20" : ""
          } select-none`}
          data-tauri-drag-region
        >
          <SidebarToggleButton />
          <div className="font-semibold text-sm px-2 py-1 h-auto min-h-0">
            <span className="text-primary">Secrets&nbsp;</span>
            <span className="text-base-content">Manager</span>
          </div>
        </div>
        <div className="flex-none gap-1">
          <ThemeToggle />
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <Outlet />
      </div>
    </div>
  );
}

function SidebarToggleButton() {
  const leftSidebarOpen = useUiStore((state) => state.leftSidebarOpen);
  const toggleLeftSidebar = useUiStore((state) => state.toggleLeftSidebar);

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
