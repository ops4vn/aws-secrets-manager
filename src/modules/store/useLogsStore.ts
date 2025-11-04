import { create } from "zustand";

type State = {
  logs: string[];
  autoScrollLogs: boolean;
};

type Actions = {
  pushLog: (msg: string) => void;
  pushInfo: (msg: string) => void;
  pushWarn: (msg: string) => void;
  pushError: (msg: string) => void;
  pushDebug: (msg: string) => void;
  pushSuccess: (msg: string) => void;
  clearLogs: () => void;
  setAutoScrollLogs: (v: boolean) => void;
};

export const useLogsStore = create<State & Actions>((set, get) => ({
  logs: [],
  autoScrollLogs: true,

  pushLog: (msg) =>
    set((st) => {
      const ts = new Date().toLocaleTimeString();
      const line = `[${ts}] ${msg}`;
      return { logs: [...st.logs, line].slice(-500) };
    }),
  pushInfo: (msg) => { get().pushLog(`[INFO] ${msg}`); },
  pushWarn: (msg) => { get().pushLog(`[WARN] ${msg}`); },
  pushError: (msg) => { get().pushLog(`[ERROR] ${msg}`); },
  pushDebug: (msg) => { get().pushLog(`[DEBUG] ${msg}`); },
  pushSuccess: (msg) => { get().pushLog(`[SUCCESS] ${msg}`); },
  clearLogs: () => set({ logs: [] }),
  setAutoScrollLogs: (v) => set({ autoScrollLogs: v }),
}));

