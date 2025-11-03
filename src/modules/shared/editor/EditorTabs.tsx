import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import type { EditorTab } from "../types";

type Props = {
  tabs: EditorTab[];
  activeTabId: string | null;
  isCreatingNew: boolean;
  switchTab: (id: string) => void;
  closeTab: (id: string) => void;
  getTabDisplayName: (secretId: string, allTabs: EditorTab[]) => string;
  isProdSecret: (secretId: string) => boolean;
};

export function EditorTabs({
  tabs,
  activeTabId,
  isCreatingNew,
  switchTab,
  closeTab,
  getTabDisplayName,
  isProdSecret,
}: Props) {
  const tabsContainerRef = useRef<HTMLDivElement | null>(null);

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

  if (tabs.length === 0 || isCreatingNew) return null;

  return (
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
            className={`text-sm whitespace-nowrap max-w-[200px] truncate ${
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
  );
}

export default EditorTabs;


