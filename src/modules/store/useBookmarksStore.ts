import { create } from "zustand";
import { api } from "../services/tauriApi";

type State = {
  bookmarks: string[];
  recentSecrets: string[];
};

type Actions = {
  initLoad: () => Promise<void>;
  addBookmark: (secretId: string) => Promise<void>;
  removeBookmark: (secretId: string) => Promise<void>;
  addToRecent: (secretId: string) => Promise<void>;
  clearRecentSecrets: () => Promise<void>;
};

export const useBookmarksStore = create<State & Actions>((set, get) => ({
  bookmarks: [],
  recentSecrets: [],

  initLoad: async () => {
    const bookmarks = await api.loadBookmarks();
    if (bookmarks) set({ bookmarks });
    const recent = await api.loadRecentSecrets();
    if (recent) set({ recentSecrets: recent });
  },

  addBookmark: async (secretId: string) => {
    const st = get();
    if (st.bookmarks.includes(secretId)) return;
    const newBookmarks = [...st.bookmarks, secretId];
    set({ bookmarks: newBookmarks });
    await api.saveBookmarks(newBookmarks);
  },

  removeBookmark: async (secretId: string) => {
    const st = get();
    const newBookmarks = st.bookmarks.filter((id) => id !== secretId);
    set({ bookmarks: newBookmarks });
    await api.saveBookmarks(newBookmarks);
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
}));

