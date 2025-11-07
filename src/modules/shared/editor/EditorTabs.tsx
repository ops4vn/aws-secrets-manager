import { useEffect, useRef, useState } from "react";
import { Copy, X } from "lucide-react";
import type { EditorTab } from "../types";

type Props = {
  tabs: EditorTab[];
  activeTabId: string | null;
  isCreatingNew: boolean;
  switchTab: (id: string) => void;
  closeTab: (id: string) => void;
  closeOtherTabs: (id: string) => void;
  getTabDisplayName: (secretId: string, allTabs: EditorTab[]) => string;
  isProdSecret: (secretId: string) => boolean;
};

type ContextMenuState = {
  visible: boolean;
  x: number;
  y: number;
  tabId: string;
  tabName: string;
} | null;

export function EditorTabs({
  tabs,
  activeTabId,
  isCreatingNew,
  switchTab,
  closeTab,
  closeOtherTabs,
  getTabDisplayName,
  isProdSecret,
}: Props) {
  const tabsContainerRef = useRef<HTMLDivElement | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  const contextMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!tabsContainerRef.current || !activeTabId) return;
    const container = tabsContainerRef.current;
    const activeEl = container.querySelector(
      `[data-tab-id="${activeTabId}"]`
    ) as HTMLElement | null;
    if (!activeEl) return;

    const elLeft = activeEl.offsetLeft;
    const elRight = elLeft + activeEl.offsetWidth;
    const cLeft = container.scrollLeft;
    const cRight = cLeft + container.clientWidth;

    if (elLeft < cLeft || elRight > cRight) {
      activeEl.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }, [activeTabId, tabs.length]);

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };

    if (contextMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [contextMenu]);

  const handleContextMenu = (e: React.MouseEvent, tab: EditorTab) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      tabId: tab.id,
      tabName: tab.secretId,
    });
  };

  const handleCloseTab = (tabId: string) => {
    closeTab(tabId);
    setContextMenu(null);
  };

  const handleCloseOtherTabs = (tabId: string) => {
    closeOtherTabs(tabId);
    setContextMenu(null);
  };

  const handleCopyTabName = async (tabName: string) => {
    try {
      await navigator.clipboard.writeText(tabName);
      setContextMenu(null);
    } catch (e) {
      console.error("Failed to copy tab name:", e);
    }
  };

  if (tabs.length === 0 || isCreatingNew) return null;

  return (
    <>
      <div ref={tabsContainerRef} className="flex items-center gap-1 mb-2 overflow-x-auto border-b border-base-300 pb-1">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            data-tab-id={tab.id}
            className={`flex items-center gap-1 px-3 py-1 rounded-t cursor-pointer border-b-2 transition-colors ${
              tab.id === activeTabId
                ? "bg-base-200 border-primary text-primary"
                : "hover:bg-base-100 border-transparent"
            }`}
            onClick={() => switchTab(tab.id)}
            onContextMenu={(e) => handleContextMenu(e, tab)}
            title={tab.secretId}
            onAuxClick={(e) => {
              if ((e as React.MouseEvent).button === 1) {
                e.preventDefault();
                e.stopPropagation();
                closeTab(tab.id);
              }
            }}
          >
            <span
              className={`text-sm whitespace-nowrap max-w-[200px] truncate select-none ${
                isProdSecret(tab.secretId) ? "text-error font-bold" : ""
              }`}
            >
              {getTabDisplayName(tab.secretId, tabs)}
            </span>
            <button
              className="btn btn-ghost btn-xs h-4 w-4 min-h-0 p-0 hover:bg-error hover:text-error-content"
              onClick={(e) => {
                e.stopPropagation();
                closeTab(tab.id);
              }}
              title="Close tab"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed z-50 bg-base-100 border border-base-300 rounded-md shadow-lg py-1 min-w-[160px]"
          style={{
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`,
          }}
        >
          <button
            className="w-full px-4 py-2 text-left text-sm hover:bg-base-200 flex items-center gap-2"
            onClick={() => handleCloseTab(contextMenu.tabId)}
          >
            <X className="h-4 w-4" />
            Close tab
          </button>
          <button
            className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 ${
              tabs.length <= 1
                ? "opacity-50 cursor-not-allowed"
                : "hover:bg-base-200"
            }`}
            onClick={() => {
              if (tabs.length > 1) {
                handleCloseOtherTabs(contextMenu.tabId);
              }
            }}
            disabled={tabs.length <= 1}
            title={tabs.length <= 1 ? "Only one tab open" : "Close other tabs"}
          >
            <X className="h-4 w-4" />
            Close other tabs
          </button>
          <div className="divider my-0" />
          <button
            className="w-full px-4 py-2 text-left text-sm hover:bg-base-200 flex items-center gap-2"
            onClick={() => handleCopyTabName(contextMenu.tabName)}
          >
            <Copy className="h-4 w-4" />
            Copy tab name
          </button>
        </div>
      )}
    </>
  );
}

export default EditorTabs;


