import { create } from "zustand";
import { api, SecretDescription, SecretTag, SecretVersion } from "../services/tauriApi";
import { useLogsStore } from "./useLogsStore";

// Holds describe metadata + version history for the single active secret.
// When the active secret changes, the previous secret's data is cleared.
type State = {
  secretId: string | null;
  describe: SecretDescription | null;
  versions: SecretVersion[];
  loadingDescribe: boolean;
  loadingVersions: boolean;
  // When set, the editor shows an inline diff of this old version vs current.
  versionDiff: { versionId: string; content: string } | null;
};

type Actions = {
  loadDescribe: (profile: string | null, secretId: string, force?: boolean) => Promise<void>;
  loadVersions: (profile: string | null, secretId: string, force?: boolean) => Promise<void>;
  addTags: (profile: string | null, secretId: string, tags: SecretTag[]) => Promise<void>;
  removeTag: (profile: string | null, secretId: string, key: string) => Promise<void>;
  compareVersion: (profile: string | null, secretId: string, versionId: string) => Promise<void>;
  clearVersionDiff: () => void;
};

export const useSecretDetailsStore = create<State & Actions>((set, get) => ({
  secretId: null,
  describe: null,
  versions: [],
  loadingDescribe: false,
  loadingVersions: false,
  versionDiff: null,

  loadDescribe: async (profile, secretId, force = false) => {
    const st = get();
    if (st.secretId !== secretId) {
      set({ secretId, describe: null, versions: [], versionDiff: null });
    } else if (!force && st.describe) {
      return;
    }
    set({ loadingDescribe: true });
    try {
      const d = await api.describeSecret(profile, secretId);
      if (get().secretId === secretId) set({ describe: d });
    } catch (e) {
      useLogsStore.getState().pushError(`Describe failed for ${secretId}: ${String(e)}`);
    } finally {
      set({ loadingDescribe: false });
    }
  },

  loadVersions: async (profile, secretId, force = false) => {
    const st = get();
    if (st.secretId !== secretId) {
      set({ secretId, describe: null, versions: [], versionDiff: null });
    } else if (!force && st.versions.length) {
      return;
    }
    set({ loadingVersions: true });
    try {
      const v = await api.listSecretVersions(profile, secretId);
      if (get().secretId === secretId) set({ versions: v });
    } catch (e) {
      useLogsStore.getState().pushError(`Version history failed for ${secretId}: ${String(e)}`);
    } finally {
      set({ loadingVersions: false });
    }
  },

  addTags: async (profile, secretId, tags) => {
    const { pushSuccess, pushError } = useLogsStore.getState();
    try {
      await api.tagSecret(profile, secretId, tags);
      pushSuccess(`Tagged ${secretId}`);
      await get().loadDescribe(profile, secretId, true);
    } catch (e) {
      pushError(`Failed to tag ${secretId}: ${String(e)}`);
    }
  },

  removeTag: async (profile, secretId, key) => {
    const { pushSuccess, pushError } = useLogsStore.getState();
    try {
      await api.untagSecret(profile, secretId, [key]);
      pushSuccess(`Removed tag ${key}`);
      await get().loadDescribe(profile, secretId, true);
    } catch (e) {
      pushError(`Failed to remove tag: ${String(e)}`);
    }
  },

  compareVersion: async (profile, secretId, versionId) => {
    const { pushError } = useLogsStore.getState();
    try {
      const c = await api.fetchSecretVersion(profile, secretId, versionId);
      let content = "";
      if (c.string != null) {
        try {
          content = JSON.stringify(JSON.parse(c.string), null, 2);
        } catch {
          content = c.string;
        }
      } else if (c.binary_base64 != null) {
        content = c.binary_base64;
      }
      if (get().secretId === secretId) {
        set({ versionDiff: { versionId, content } });
      }
    } catch (e) {
      pushError(`Failed to load version ${versionId}: ${String(e)}`);
    }
  },

  clearVersionDiff: () => set({ versionDiff: null }),
}));
