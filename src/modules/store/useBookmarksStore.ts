import { create } from "zustand";
import { api } from "../services/tauriApi";
import { useProfileStore } from "./useProfileStore";

type State = {
  bookmarks: string[];
  recentSecrets: string[];
};

type Actions = {
  initLoad: () => Promise<void>;
  loadBookmarksForProfile: (profile: string | null) => Promise<void>;
  addBookmark: (secretId: string) => Promise<void>;
  removeBookmark: (secretId: string) => Promise<void>;
  addToRecent: (secretId: string) => Promise<void>;
  clearRecentSecrets: () => Promise<void>;
  clearBookmarks: () => Promise<void>;
};

export const useBookmarksStore = create<State & Actions>((set, get) => ({
  bookmarks: [],
  recentSecrets: [],

  initLoad: async () => {
    const { defaultProfile } = useProfileStore.getState();
    const profile = defaultProfile ?? "default";
    const bookmarks = await api.loadBookmarks(profile);
    if (bookmarks) set({ bookmarks });
    const recent = await api.loadRecentSecrets();
    if (recent) set({ recentSecrets: recent });
  },

  loadBookmarksForProfile: async (profile: string | null) => {
    const { defaultProfile } = useProfileStore.getState();
    const profileToUse = profile === "default" ? defaultProfile : profile;
    const bookmarks = await api.loadBookmarks(profileToUse ?? "default");
    set({ bookmarks: bookmarks ?? [] });
  },

  addBookmark: async (secretId: string) => {
    const st = get();
    if (st.bookmarks.includes(secretId)) return;
    const { selectedProfile, defaultProfile } = useProfileStore.getState();
    const profile = selectedProfile ?? defaultProfile ?? "default";
    const newBookmarks = [...st.bookmarks, secretId];
    set({ bookmarks: newBookmarks });
    await api.saveBookmarks(profile, newBookmarks);
  },

  removeBookmark: async (secretId: string) => {
    const st = get();
    const { selectedProfile, defaultProfile } = useProfileStore.getState();
    const profile = selectedProfile ?? defaultProfile ?? "default";
    const newBookmarks = st.bookmarks.filter((id) => id !== secretId);
    set({ bookmarks: newBookmarks });
    await api.saveBookmarks(profile, newBookmarks);
  },

  addToRecent: async (secretId: string) => {
    const st = get();
    const filtered = st.recentSecrets.filter((id) => id !== secretId);
    const newRecent = [secretId, ...filtered].slice(0, 20);
    set({ recentSecrets: newRecent });
    await api.saveRecentSecrets(newRecent);
  },

  clearRecentSecrets: async () => {
    set({ recentSecrets: [] });
    await api.saveRecentSecrets([]);
  },

  clearBookmarks: async () => {
    const { selectedProfile, defaultProfile } = useProfileStore.getState();
    const profile = selectedProfile ?? defaultProfile ?? "default";
    set({ bookmarks: [] });
    await api.saveBookmarks(profile, []);
  },
}));

