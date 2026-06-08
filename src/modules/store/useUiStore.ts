import { create } from "zustand";

type UiState = {
  leftSidebarOpen: boolean;
  rightPanelOpen: boolean;
  rightPanelWidth: number; // Width in pixels
  // Global search dialog (Cmd/Ctrl+F) and keyboard-shortcuts help dialog.
  globalSearchOpen: boolean;
  helpOpen: boolean;
};

type UiActions = {
  setLeftSidebarOpen: (v: boolean) => void;
  toggleLeftSidebar: () => void;
  setRightPanelOpen: (v: boolean) => void;
  toggleRightPanel: () => void;
  setRightPanelWidth: (width: number) => void;
  setGlobalSearchOpen: (v: boolean) => void;
  setHelpOpen: (v: boolean) => void;
};

const DEFAULT_RIGHT_PANEL_WIDTH = 384; // w-lg = 384px

export const useUiStore = create<UiState & UiActions>((set, get) => ({
  leftSidebarOpen: true,
  rightPanelOpen: true,
  rightPanelWidth: DEFAULT_RIGHT_PANEL_WIDTH,
  globalSearchOpen: false,
  helpOpen: false,
  setLeftSidebarOpen: (v) => set({ leftSidebarOpen: v }),
  toggleLeftSidebar: () => set({ leftSidebarOpen: !get().leftSidebarOpen }),
  setRightPanelOpen: (v) => set({ rightPanelOpen: v }),
  toggleRightPanel: () => set({ rightPanelOpen: !get().rightPanelOpen }),
  setRightPanelWidth: (width) => {
    const MIN_WIDTH = 300;
    const MAX_WIDTH = 600;
    const clampedWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, width));
    set({ rightPanelWidth: clampedWidth });
  },
  setGlobalSearchOpen: (v) => set({ globalSearchOpen: v }),
  setHelpOpen: (v) => set({ helpOpen: v }),
}));


