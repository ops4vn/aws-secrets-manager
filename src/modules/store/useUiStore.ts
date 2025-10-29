import { create } from "zustand";

type UiState = {
  leftSidebarOpen: boolean;
  rightPanelOpen: boolean;
};

type UiActions = {
  setLeftSidebarOpen: (v: boolean) => void;
  toggleLeftSidebar: () => void;
  setRightPanelOpen: (v: boolean) => void;
  toggleRightPanel: () => void;
};

export const useUiStore = create<UiState & UiActions>((set, get) => ({
  leftSidebarOpen: true,
  rightPanelOpen: true,
  setLeftSidebarOpen: (v) => set({ leftSidebarOpen: v }),
  toggleLeftSidebar: () => set({ leftSidebarOpen: !get().leftSidebarOpen }),
  setRightPanelOpen: (v) => set({ rightPanelOpen: v }),
  toggleRightPanel: () => set({ rightPanelOpen: !get().rightPanelOpen }),
}));


