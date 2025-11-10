import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { useLogsStore } from "./useLogsStore";

type UpdaterUpdate = any;

type UpdaterState = {
  showUpdateModal: boolean;
  isDownloading: boolean;
  downloadedBytes: number;
  contentLength: number;
  isDownloaded: boolean;
  openCount: number;
  deferUntil: number | null;
  currentUpdate: UpdaterUpdate | null;
};

type UpdaterActions = {
  initCheck: (forcePrompt?: boolean) => Promise<void>;
  startDownload: () => Promise<void>;
  restartAndInstall: () => Promise<void>;
  later: () => Promise<void>;
  hideModal: () => void;
};

export const useUpdaterStore = create<UpdaterState & UpdaterActions>((set, get) => ({
  showUpdateModal: false,
  isDownloading: false,
  downloadedBytes: 0,
  contentLength: 0,
  isDownloaded: false,
  openCount: 0,
  deferUntil: null,
  currentUpdate: null,

  initCheck: async (forcePrompt = false) => {
    try {
      const { pushInfo, pushSuccess } = useLogsStore.getState();
      pushInfo("Checking for updates...");
      const oc = await invoke<number>("increment_open_count");
      const du = await invoke<number | null>("get_update_defer_until");
      set({ openCount: oc || 0, deferUntil: du ?? null });

      const update = await check();
      if (update) {
        set({ currentUpdate: update });
        const shouldPrompt = forcePrompt || du == null || (oc || 0) >= (du as number);
        pushInfo(`Update available ${update.currentVersion} -> ${update.version}`);
        if (shouldPrompt) set({ showUpdateModal: true });
      } else {
        pushSuccess("Already up-to-date.");
      }
    } catch (e) {
      console.error(e);
      const { pushError } = useLogsStore.getState();
      pushError("Update check failed. Please contact support.");
    }
  },

  startDownload: async () => {
    const upd = get().currentUpdate;
    if (!upd) return;
    set({ isDownloading: true, downloadedBytes: 0, contentLength: 0, isDownloaded: false });
    const { pushInfo, pushSuccess, pushError } = useLogsStore.getState();
    const formatBytes = (bytes: number) => {
      if (!bytes || bytes <= 0) return "0 B";
      const units = ["B", "KB", "MB", "GB", "TB"];
      let i = 0;
      let n = bytes;
      while (n >= 1024 && i < units.length - 1) {
        n = n / 1024;
        i++;
      }
      return `${n.toFixed(1)} ${units[i]}`;
    };
    try {
      await upd.download((event: any) => {
        switch (event.event) {
          case 'Started':
            set({ contentLength: event.data.contentLength || 0 });
            if (event.data.contentLength) {
              pushInfo(`Download started (${formatBytes(event.data.contentLength)}).`);
            } else {
              pushInfo("Download started.");
            }
            break;
          case 'Progress':
            set((s) => ({ downloadedBytes: s.downloadedBytes + (event.data.chunkLength || 0) }));
            break;
          case 'Finished':
            set({ isDownloaded: true });
            pushSuccess("Download completed.");
            break;
          default:
            break;
        }
      });
    } catch (e) {
      console.error(e);
      set({ isDownloading: false });
      pushError("Download failed.");
    }
  },

  restartAndInstall: async () => {
    const upd = get().currentUpdate;
    if (!upd) return;
    const { pushInfo, pushError } = useLogsStore.getState();
    try {
      pushInfo("Installing update and restarting...");
      await upd.install();
      await relaunch();
    } catch (e) {
      console.error(e);
      pushError("Install failed.");
    }
  },

  later: async () => {
    const { openCount } = get();
    const { pushInfo, pushError } = useLogsStore.getState();
    try {
      await invoke<boolean>("set_update_defer_until", { value: (openCount || 0) + 5 });
      const until = (openCount || 0) + 5;
      pushInfo(`Update postponed. Will remind after ${until} opens.`);
    } catch (e) {
      console.error(e);
      pushError("Failed to postpone update reminder.");
    } finally {
      set({ showUpdateModal: false });
    }
  },

  hideModal: () => set({ showUpdateModal: false }),
}));

export default useUpdaterStore;


