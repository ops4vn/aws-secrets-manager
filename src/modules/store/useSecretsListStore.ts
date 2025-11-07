import { create } from "zustand";
import { api } from "../services/tauriApi";
import { useLogsStore } from "./useLogsStore";

type State = {
  allNames: string[];
  secretMetadata: Record<string, boolean>; // name -> is_binary
  showSecretsTree: boolean;
  searchQuery: string;
};

type Actions = {
  setShowSecretsTree: (v: boolean) => void;
  setSearchQuery: (q: string) => void;
  listSecrets: (profile: string | null, force?: boolean) => Promise<void>;
  updateSecretMetadata: (profile: string | null, secretId: string, isBinary: boolean) => Promise<void>;
};

export const useSecretsListStore = create<State & Actions>((set, get) => ({
  allNames: [],
  secretMetadata: {},
  showSecretsTree: false,
  searchQuery: "",

  setShowSecretsTree: (v) => set({ showSecretsTree: v }),
  setSearchQuery: (q) => set({ searchQuery: q }),

  listSecrets: async (profile, force = false) => {
    const { pushInfo, pushWarn, pushSuccess } = useLogsStore.getState();
    set({ showSecretsTree: true });
    if (!profile) {
      pushWarn("No profile selected");
      return;
    }
    if (!force) {
      pushInfo("Listing secrets...");
      const cached = await api.loadCachedSecretNames(profile);
      if (cached && cached.length) {
        set({ allNames: cached });
        pushSuccess(`Loaded ${cached.length} cached secrets`);
        return;
      }
    } else {
      pushWarn("Force reloading secrets...");
      try {
        await api.saveCachedSecretNames(profile, []);
      } catch { }
      try {
        await api.saveCachedSecretMetadata(profile, []);
      } catch { }
      set({ allNames: [], secretMetadata: {} });
    }
    const names = await api.listSecrets(profile);
    await api.saveCachedSecretNames(profile, names);
    set({ allNames: names });
    pushSuccess(`Loaded ${names.length} secrets`);
  },

  updateSecretMetadata: async (profile, secretId, isBinary) => {
    const st = get();
    const currentMetadata = st.secretMetadata;
    if (currentMetadata[secretId] !== isBinary) {
      currentMetadata[secretId] = isBinary;
      set({ secretMetadata: { ...currentMetadata } });
      if (profile) {
        const cachedMetadata = await api.loadCachedSecretMetadata(profile);
        let updatedMetadata: Array<{ name: string; is_binary: boolean }>;
        if (cachedMetadata) {
          const existingIndex = cachedMetadata.findIndex(m => m.name === secretId);
          if (existingIndex >= 0) {
            updatedMetadata = cachedMetadata.map(m =>
              m.name === secretId ? { name: m.name, is_binary: isBinary } : m
            );
          } else {
            updatedMetadata = [...cachedMetadata, { name: secretId, is_binary: isBinary }];
          }
        } else {
          updatedMetadata = [{ name: secretId, is_binary: isBinary }];
        }
        await api.saveCachedSecretMetadata(profile, updatedMetadata);
      }
    }
  },
}));

