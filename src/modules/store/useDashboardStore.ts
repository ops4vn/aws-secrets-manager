import { create } from "zustand";
import { listen } from "@tauri-apps/api/event";
import { api, SecretContent } from "../services/tauriApi";

type State = {
  // profiles
  profiles: string[];
  selectedProfile: string | null;
  defaultProfile: string | null;

  // ui
  showSecretsTree: boolean;
  searchQuery: string;

  // logs
  logs: string[];
  autoScrollLogs: boolean;

  // editor
  secretId: string;
  editorContent: string;
  isEditing: boolean;
  isCreatingNew: boolean;
  isBinary: boolean;
  allNames: string[];
  secretMetadata: Record<string, boolean>; // name -> is_binary
  importedBinary: { name: string; size: number; base64: string } | null;

  // tabs
  tabs: Array<{ id: string; secretId: string; content: string; isBinary: boolean }>;
  activeTabId: string | null;

  // sso
  ssoValid: boolean | null;
  ssoChecking: boolean;
  _eventsBound: boolean;

  // bookmarks and recent
  bookmarks: string[];
  recentSecrets: string[];
};

type Actions = {
  initLoad: () => Promise<void>;
  setSelectedProfile: (p: string | null) => void;
  setSearchQuery: (q: string) => void;
  setShowSecretsTree: (v: boolean) => void;

  // logs
  pushLog: (msg: string) => void;
  pushInfo: (msg: string) => void;
  pushWarn: (msg: string) => void;
  pushError: (msg: string) => void;
  pushDebug: (msg: string) => void;
  pushSuccess: (msg: string) => void;
  clearLogs: () => void;
  setAutoScrollLogs: (v: boolean) => void;

  // profiles ops
  saveDefault: () => Promise<void>;
  listSecrets: (force?: boolean) => Promise<void>;

  // sso
  checkSsoFlow: () => Promise<boolean>;
  triggerSsoLogin: () => Promise<void>;

  // secrets
  fetchSecretById: (name: string) => Promise<void>;
  startEdit: () => void;
  startCreateNew: () => void;
  setEditorContent: (v: string) => void;
  setIsBinary: (v: boolean) => void;
  setImportedBinary: (p: { name: string; size: number; base64: string } | null) => void;
  save: () => Promise<void>;
  cancelEdit: () => void;
  setSecretId: (v: string) => void;

  // tabs
  openTab: (secretId: string, content: string, isBinary: boolean) => string;
  closeTab: (tabId: string) => void;
  switchTab: (tabId: string) => void;

  // bookmarks and recent
  addBookmark: (secretId: string) => Promise<void>;
  removeBookmark: (secretId: string) => Promise<void>;
  addToRecent: (secretId: string) => Promise<void>;
};

export const useDashboardStore = create<State & Actions>((set, get) => ({
  profiles: [],
  selectedProfile: null,
  defaultProfile: null,

  showSecretsTree: false,
  searchQuery: "",

  logs: [],
  autoScrollLogs: true,

  secretId: "",
  editorContent: "",
  isEditing: false,
  isCreatingNew: false,
  isBinary: false,
  allNames: [],
  secretMetadata: {},
  importedBinary: null,

  tabs: [],
  activeTabId: null,

  ssoValid: null,
  ssoChecking: false,
  _eventsBound: false,

  bookmarks: [],
  recentSecrets: [],

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

  setSelectedProfile: (p) => set({ selectedProfile: p }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setShowSecretsTree: (v) => set({ showSecretsTree: v }),
  setEditorContent: (v) => {
    const st = get();
    set({ editorContent: v });
    // Sync với tab active
    if (st.activeTabId) {
      const updatedTabs = st.tabs.map(t =>
        t.id === st.activeTabId ? { ...t, content: v } : t
      );
      set({ tabs: updatedTabs });
    }
  },
  setIsBinary: (v) => set({ isBinary: v }),
  setImportedBinary: (p) => set({ importedBinary: p }),
  setSecretId: (v) => set({ secretId: v }),

  initLoad: async () => {
    try {
      const df = await api.loadDefaultProfile();
      set({ defaultProfile: df });
      const ps = await api.loadProfiles();
      set({ profiles: ps });
      if (df) {
        const cached = await api.loadCachedSecretNames(df);
        if (cached && cached.length > 0) {
          set({ allNames: cached, showSecretsTree: true });
          // Load metadata if available
          const cachedMetadata = await api.loadCachedSecretMetadata(df);
          if (cachedMetadata) {
            const metadataMap: Record<string, boolean> = {};
            cachedMetadata.forEach(m => {
              metadataMap[m.name] = m.is_binary;
            });
            set({ secretMetadata: metadataMap });
          }
          get().pushSuccess(`Loaded ${cached.length} cached secrets`);
        }
      }

      // Bind event listeners once
      const st = get();
      if (!st._eventsBound) {
        void listen<string>("sso_login_ok", async (ev) => {
          set({ ssoValid: true, ssoChecking: false });
          get().pushSuccess(`SSO login ok${ev.payload ? ` for ${ev.payload}` : ""}`);
        });
        void listen("sso_login_timeout", () => {
          set({ ssoValid: false, ssoChecking: false });
          get().pushWarn("SSO login timeout");
        });
        set({ _eventsBound: true });
      }

      // Initial SSO check on app start
      const st2 = get();
      if (st2.selectedProfile ?? st2.defaultProfile) {
        void st2.checkSsoFlow();
      }

      // Load bookmarks and recent secrets
      const bookmarks = await api.loadBookmarks();
      if (bookmarks) set({ bookmarks });
      const recent = await api.loadRecentSecrets();
      if (recent) set({ recentSecrets: recent });
    } catch (e) {
      get().pushError(`Init error: ${String(e)}`);
    }
  },

  saveDefault: async () => {
    const st = get();
    await api.saveDefaultProfile(st.selectedProfile ?? "default");
    set({ defaultProfile: st.selectedProfile });
    st.pushSuccess("Saved default profile");
  },

  listSecrets: async (force = false) => {
    const st = get();
    const profile = st.selectedProfile ?? st.defaultProfile;
    set({ showSecretsTree: true });
    if (!profile) {
      st.pushWarn("No profile selected");
      return;
    }
    if (!force) {
      st.pushInfo("Listing secrets...");
      const cached = await api.loadCachedSecretNames(profile);
      if (cached && cached.length) {
        set({ allNames: cached });
        st.pushSuccess(`Loaded ${cached.length} cached secrets`);
        return;
      }
    } else {
      st.pushWarn("Force reloading secrets...");
      // Clear caches (names + metadata) and in-memory state before reloading
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
    st.pushSuccess(`Loaded ${names.length} secrets`);
  },

  checkSsoFlow: async () => {
    const st = get();
    const profile = st.selectedProfile ?? st.defaultProfile;
    if (!profile) {
      st.pushWarn("No profile selected");
      return false;
    }
    set({ ssoChecking: true });
    st.pushInfo("Checking SSO...");
    try {
      const ok = await api.checkSso(profile);
      if (ok) {
        set({ ssoValid: true, ssoChecking: false });
        st.pushSuccess("SSO valid");
        return true;
      }
      // Theo backend mới, checkSso nếu fail sẽ throw, nên nhánh này hiếm gặp
      set({ ssoValid: false, ssoChecking: false });
      st.pushWarn("SSO invalid");
      return false;
    } catch (e) {
      const msg = typeof e === 'string' ? e : (e as any)?.message ?? 'SSO check failed';
      set({ ssoValid: false, ssoChecking: false });
      st.pushError(String(msg));
      return false;
    }
  },

  triggerSsoLogin: async () => {
    const st = get();
    const profile = st.selectedProfile ?? st.defaultProfile;
    if (!profile) {
      st.pushWarn("No profile selected");
      return;
    }
    try {
      await api.triggerSsoLogin(profile);
      st.pushInfo("Opened SSO login in browser...");
    } catch (e) {
      st.pushError(`Cannot open SSO login: ${String(e)}`);
    }
  },

  fetchSecretById: async (name: string) => {
    const st = get();
    const profile = st.selectedProfile ?? st.defaultProfile;

    // Kiểm tra xem secret đã có trong tab chưa
    const existingTab = st.tabs.find(t => t.secretId === name);
    if (existingTab) {
      // Tab đã tồn tại, chỉ cần switch sang tab đó
      st.switchTab(existingTab.id);
      st.pushInfo(`Switched to existing tab: ${name}`);
      return;
    }

    st.pushInfo(`Fetching secret: ${name}`);
    try {
      const res: SecretContent = await api.fetchSecret(profile ?? null, name);
      let content = "";
      let isBinary = false;

      if (res.string) {
        try {
          const parsed = JSON.parse(res.string);
          content = JSON.stringify(parsed, null, 2);
          isBinary = false;
        } catch {
          content = res.string;
          isBinary = false;
        }
      } else if (res.binary_base64) {
        content = res.binary_base64;
        isBinary = true;
      } else {
        content = "";
        isBinary = false;
      }

      // Mở tab mới với content đã fetch
      const tabId = st.openTab(name, content, isBinary);
      // Sync editor state với tab vừa mở
      set({
        activeTabId: tabId,
        secretId: name,
        editorContent: content,
        isBinary: isBinary,
        isEditing: false,
        isCreatingNew: false
      });

      // Update metadata cache (only after actual fetch, not from list)
      const currentMetadata = st.secretMetadata;
      if (currentMetadata[name] !== isBinary) {
        currentMetadata[name] = isBinary;
        set({ secretMetadata: { ...currentMetadata } });
        // Save to cache - only update this specific secret's metadata
        const cachedMetadata = await api.loadCachedSecretMetadata(profile ?? "");
        let updatedMetadata: Array<{ name: string; is_binary: boolean }>;
        if (cachedMetadata) {
          // Check if secret already exists in cache, update it; otherwise add it
          const existingIndex = cachedMetadata.findIndex(m => m.name === name);
          if (existingIndex >= 0) {
            updatedMetadata = cachedMetadata.map(m =>
              m.name === name ? { name: m.name, is_binary: isBinary } : m
            );
          } else {
            updatedMetadata = [...cachedMetadata, { name, is_binary: isBinary }];
          }
        } else {
          updatedMetadata = [{ name, is_binary: isBinary }];
        }
        await api.saveCachedSecretMetadata(profile ?? "", updatedMetadata);
      }

      // Add to recent secrets
      await st.addToRecent(name);
      st.pushSuccess("Fetched secret");
    } catch (e) {
      st.pushError(`Fetch error: ${String(e)}`);
    }
  },

  startEdit: () => {
    set({ isEditing: true, isCreatingNew: false });
    get().pushInfo("Switched to edit mode");
  },
  startCreateNew: () => {
    set({ isCreatingNew: true, isEditing: true, editorContent: "", secretId: "", importedBinary: null, isBinary: false });
    get().pushInfo("Switched to create new secret mode");
  },
  save: async () => {
    const st = get();
    const profile = st.selectedProfile ?? st.defaultProfile;
    st.pushInfo((st.isCreatingNew ? "Creating" : "Updating") + ` secret: ${st.secretId}`);
    if (st.isCreatingNew) {
      const payload = st.isBinary ? (st.importedBinary?.base64 ?? st.editorContent) : st.editorContent;
      await api.createSecret(profile, st.secretId, payload, null, st.isBinary);
      st.pushSuccess("Created secret");
    } else {
      const payload = st.isBinary ? (st.importedBinary?.base64 ?? st.editorContent) : st.editorContent;
      await api.updateSecret(profile, st.secretId, payload, null, st.isBinary);
      st.pushSuccess("Updated secret");
    }

    // Cập nhật content trong tab sau khi save
    if (st.activeTabId) {
      const updatedTabs = st.tabs.map(t =>
        t.id === st.activeTabId ? { ...t, content: st.editorContent, isBinary: st.isBinary } : t
      );
      set({ tabs: updatedTabs });
    }

    set({ isEditing: false, isCreatingNew: false, importedBinary: null });
  },
  cancelEdit: () => {
    const st = get();
    // Restore content từ tab khi cancel
    if (st.activeTabId) {
      const tab = st.tabs.find(t => t.id === st.activeTabId);
      if (tab) {
        set({
          editorContent: tab.content,
          isEditing: false,
          isCreatingNew: false
        });
      }
    } else {
      set({ isEditing: false, isCreatingNew: false });
    }
    get().pushInfo("Edit mode cancelled");
  },

  openTab: (secretId: string, content: string, isBinary: boolean) => {
    const st = get();
    const tabId = `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newTab = { id: tabId, secretId, content, isBinary };
    set({ tabs: [...st.tabs, newTab], activeTabId: tabId });
    return tabId;
  },

  closeTab: (tabId: string) => {
    const st = get();
    const newTabs = st.tabs.filter(t => t.id !== tabId);
    let newActiveTabId: string | null = null;

    if (st.activeTabId === tabId) {
      // Nếu đang đóng tab active, switch sang tab khác
      if (newTabs.length > 0) {
        const closedIndex = st.tabs.findIndex(t => t.id === tabId);
        if (closedIndex > 0) {
          newActiveTabId = newTabs[closedIndex - 1].id;
        } else {
          newActiveTabId = newTabs[0].id;
        }
      }
    } else {
      newActiveTabId = st.activeTabId;
    }

    const activeTab = newTabs.find(t => t.id === newActiveTabId);
    set({
      tabs: newTabs,
      activeTabId: newActiveTabId,
      secretId: activeTab?.secretId ?? "",
      editorContent: activeTab?.content ?? "",
      isBinary: activeTab?.isBinary ?? false,
      isEditing: false,
      isCreatingNew: false,
    });
  },

  switchTab: (tabId: string) => {
    const st = get();
    const tab = st.tabs.find(t => t.id === tabId);
    if (tab) {
      set({
        activeTabId: tabId,
        secretId: tab.secretId,
        editorContent: tab.content,
        isBinary: tab.isBinary,
        isEditing: false,
        isCreatingNew: false,
      });
    }
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
    // Remove if exists, then add to front
    const filtered = st.recentSecrets.filter((id) => id !== secretId);
    const newRecent = [secretId, ...filtered].slice(0, 20); // Keep last 20
    set({ recentSecrets: newRecent });
    await api.saveRecentSecrets(newRecent);
  },
}));


