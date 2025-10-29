import { useEffect } from "react";
import { SidebarProfiles } from "../shared/SidebarProfiles";
import { TopBar } from "../shared/TopBar";
import { EditorPanel } from "../shared/EditorPanel";
import { LogsStatus } from "../shared/LogsStatus";
import { RightPanel } from "../shared/RightPanel";
import { useDashboardStore } from "../store/useDashboardStore";

export function DashboardPage() {
  const { showSecretsTree, initLoad } = useDashboardStore();

  useEffect(() => {
    void initLoad();
  }, [initLoad]);

  return (
    <div className="flex h-[calc(100vh-64px)] min-h-0">
      <aside className="w-96 bg-base-100 border-r border-base-300 p-4 overflow-y-auto">
        <SidebarProfiles />
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <TopBar />

        <section className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 min-h-0">
            <EditorPanel />
          </div>
          <div
            className="h-2 cursor-row-resize bg-base-300/60"
            onMouseDown={(e) => {
              e.preventDefault();
              const startY = e.clientY;
              const container = e.currentTarget.parentElement as HTMLElement;
              const logsEl = container.querySelector(
                "#logs-container"
              ) as HTMLElement;
              const startHeight = logsEl.offsetHeight;
              const containerHeight = container.clientHeight;
              const onMove = (ev: MouseEvent) => {
                const dy = ev.clientY - startY;
                const newH = Math.min(
                  Math.max(96, startHeight - dy),
                  Math.max(96, containerHeight - 96)
                );
                logsEl.style.height = `${newH}px`;
              };
              const onUp = () => {
                window.removeEventListener("mousemove", onMove);
                window.removeEventListener("mouseup", onUp);
              };
              window.addEventListener("mousemove", onMove);
              window.addEventListener("mouseup", onUp);
            }}
          />
          <div id="logs-container" className="h-56 min-h-[6rem]">
            <LogsStatus />
          </div>
        </section>
      </main>

      {showSecretsTree && (
        <aside className="w-128 bg-base-100 border-l border-base-300 p-4 pt-0 overflow-y-auto">
          <RightPanel />
        </aside>
      )}
    </div>
  );
}
