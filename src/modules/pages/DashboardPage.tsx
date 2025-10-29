import { useEffect } from "react";
import { SidebarProfiles } from "../shared/SidebarProfiles";
import { TopBar } from "../shared/TopBar";
import { EditorPanel } from "../shared/EditorPanel";
import { LogsStatus } from "../shared/LogsStatus";
import { RightPanel } from "../shared/RightPanel";
import { useDashboardStore } from "../store/useDashboardStore";
import { useUiStore } from "../store/useUiStore";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function DashboardPage() {
  const { showSecretsTree, initLoad } = useDashboardStore();
  const { leftSidebarOpen, rightPanelOpen, toggleRightPanel } = useUiStore();

  useEffect(() => {
    void initLoad();
  }, [initLoad]);

  return (
    <div className="flex h-[calc(100vh-64px)] min-h-0 overflow-hidden">
      <aside
        className={`bg-base-100 border-r border-base-300 overflow-y-auto transition-transform duration-300 ease-in-out ${
          leftSidebarOpen
            ? "w-96 p-4 translate-x-0"
            : "w-0 -translate-x-full p-0"
        }`}
        aria-hidden={!leftSidebarOpen}
      >
        {/* Keep content mounted for smoother animation */}
        <div
          className={`${
            leftSidebarOpen ? "opacity-100" : "opacity-0"
          } transition-opacity duration-200`}
        >
          <SidebarProfiles />
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
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
        <div
          className={`group flex-none transition-opacity duration-300 ${
            rightPanelOpen && showSecretsTree ? "w-128 relative" : "w-0"
          }`}
        >
          <div
            className="absolute left-0 top-0 h-full w-2 z-10 cursor-pointer"
            aria-hidden="true"
          ></div>
          <button
            className={`btn btn-primary p-0 w-6 h-10 font-bold absolute top-1/2 -translate-y-1/2 z-20 shadow transition-opacity duration-100 ${
              rightPanelOpen ? "opacity-100 -left-3" : "opacity-80 right-0"
            } group-hover:opacity-100`}
            onClick={toggleRightPanel}
            title={rightPanelOpen ? "Hide secrets tree" : "Show secrets tree"}
            aria-label="Toggle secrets tree"
          >
            {rightPanelOpen ? (
              <ChevronRight className="h-6 w-6" />
            ) : (
              <ChevronLeft className="h-6 w-6" />
            )}
          </button>
          <aside
            className={`bg-base-100 border-l border-base-300 pt-0 h-full overflow-y-auto overflow-x-hidden transition-opacity duration-300 ease-in-out ${
              rightPanelOpen
                ? "opacity-100 p-4"
                : "opacity-0 p-0 pointer-events-none"
            }`}
            aria-hidden={!rightPanelOpen}
          >
            <RightPanel />
          </aside>
        </div>
      )}
    </div>
  );
}
