import { useCallback, useEffect } from "react";
import { SidebarLeftPanel } from "../shared/SidebarLeftPanel";
import { TopBar } from "../shared/TopBar";
import { EditorPanel } from "../shared/EditorPanel";
import { LogsStatus } from "../shared/LogsStatus";
import { RightPanel } from "../shared/RightPanel";
import { useProfileStore } from "../store/useProfileStore";
import { useSecretsListStore } from "../store/useSecretsListStore";
import { useBookmarksStore } from "../store/useBookmarksStore";
import { useUiStore } from "../store/useUiStore";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { api } from "../services/tauriApi";

export function DashboardPage() {
  const profileStore = useProfileStore();
  const secretsListStore = useSecretsListStore();
  const bookmarksStore = useBookmarksStore();
  const { showSecretsTree } = secretsListStore;
  const leftSidebarOpen = useUiStore((state) => state.leftSidebarOpen);
  const rightPanelOpen = useUiStore((state) => state.rightPanelOpen);
  const rightPanelWidth = useUiStore((state) => state.rightPanelWidth);
  const toggleRightPanel = useUiStore((state) => state.toggleRightPanel);

  const initLoad = useCallback(async () => {
    await profileStore.initLoad(async (prof) => {
      const cachedMetadata = await api.loadCachedSecretMetadata(prof);
      if (cachedMetadata) {
        const metadataMap: Record<string, boolean> = {};
        cachedMetadata.forEach((m) => {
          metadataMap[m.name] = m.is_binary;
        });
        useSecretsListStore.setState({ secretMetadata: metadataMap });
      }
    });
    await bookmarksStore.initLoad();
  }, [profileStore, secretsListStore, bookmarksStore]);

  useEffect(() => {
    initLoad();
  }, []);

  return (
    <div className="flex h-[calc(100vh-40px)] min-h-0 overflow-hidden">
      <aside
        className={`bg-base-100 border-r border-base-300 transition-transform duration-300 ease-in-out ${
          leftSidebarOpen
            ? "w-100 p-4 translate-x-0"
            : "w-0 -translate-x-full p-0"
        }`}
        aria-hidden={!leftSidebarOpen}
      >
        <div
          className={`h-full flex flex-col ${
            leftSidebarOpen ? "opacity-100" : "opacity-0"
          } transition-opacity duration-200`}
        >
          <SidebarLeftPanel />
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
          <div id="logs-container" className="h-80 min-h-24">
            <LogsStatus />
          </div>
        </section>
      </main>

      {showSecretsTree && (
        <div
          className={`group flex-none transition-opacity duration-300 relative ${
            rightPanelOpen && showSecretsTree ? "" : "w-0"
          }`}
          style={{
            width: rightPanelOpen && showSecretsTree ? `${rightPanelWidth}px` : "0px",
          }}
        >
          {/* Resize handle */}
          {rightPanelOpen && showSecretsTree && (
            <div
              className="absolute left-0 top-0 h-full w-1 z-30 cursor-col-resize hover:bg-primary/50 transition-colors"
              onMouseDown={(e) => {
                e.preventDefault();
                const startX = e.clientX;
                const startWidth = useUiStore.getState().rightPanelWidth;
                
                const onMove = (ev: MouseEvent) => {
                  const dx = startX - ev.clientX; // Inverted because we're resizing from left
                  const newWidth = startWidth + dx;
                  useUiStore.getState().setRightPanelWidth(newWidth);
                };
                
                const onUp = () => {
                  window.removeEventListener("mousemove", onMove);
                  window.removeEventListener("mouseup", onUp);
                  document.body.style.cursor = "";
                  document.body.style.userSelect = "";
                };
                
                window.addEventListener("mousemove", onMove);
                window.addEventListener("mouseup", onUp);
                document.body.style.cursor = "col-resize";
                document.body.style.userSelect = "none";
              }}
              title="Drag to resize"
            />
          )}
          
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
                ? "opacity-100 px-4 py-2"
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
