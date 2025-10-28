import { Outlet } from "react-router-dom";
import { Moon, Sun } from "lucide-react";

export function MainLayout() {
  return (
    <div className="flex flex-col min-h-screen bg-base-200 text-base-content">
      <div className="navbar bg-base-100 border-b border-base-300 px-4">
        <div className="flex-1 cursor-grab" data-tauri-drag-region>
          <div className="btn btn-ghost text-xl">SecManager</div>
        </div>
        <div className="flex-none gap-2">
          <label className="swap swap-rotate">
            <input type="checkbox" className="theme-controller" value="dark" />
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
