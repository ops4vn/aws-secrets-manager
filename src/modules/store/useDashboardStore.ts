import { create } from "zustand";
import { listen } from "@tauri-apps/api/event";
import { api, SecretContent } from "../services/tauriApi";
import { EditorTab } from "../shared/types";

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

  // loading
  isFetchingSecret: boolean;
  fetchingSecretId: string | null;

  // fetched large binary (do not render content)
  fetchedBinaryTooLarge: { name: string; size: number } | null;

  // tabs
  tabs: EditorTab[];
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
  _computeBase64Size: (b64: string) => number;

  // tabs
  openTab: (secretId: string, content: string, isBinary: boolean, meta?: { isTooLarge?: boolean; binarySize?: number }) => string;
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

  isFetchingSecret: false,
  fetchingSecretId: null,
  fetchedBinaryTooLarge: null,

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

  // helper: compute base64 size
  _computeBase64Size: (b64: string): number => {
    const len = b64.length;
    const padding = (b64.endsWith("==") ? 2 : (b64.endsWith("=") ? 1 : 0));
    return Math.floor((len * 3) / 4) - padding;
  },

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

        // Listen for async secret fetch events
        void listen<{ secret_id: string; content: SecretContent }>("secret_fetch_ok", async (ev) => {
          const { secret_id, content } = ev.payload;
          const st3 = get();

          // Ignore event if we're now fetching a different secret
          if (st3.isFetchingSecret && st3.fetchingSecretId !== secret_id) {
            st3.pushWarn(`Ignoring fetch result for ${secret_id} (now fetching ${st3.fetchingSecretId})`);
            return;
          }

          // Process content in chunks to avoid blocking UI
          await new Promise(resolve => setTimeout(resolve, 0));

          const st2 = get();
          let parsedContent = "";
          let isBinary = false;
          let didOpenTab = false;

          if (content.string) {
            // Yield control before parsing large JSON
            await new Promise(resolve => setTimeout(resolve, 0));

            try {
              const parsed = JSON.parse(content.string);
              // Yield again before stringifying
              await new Promise(resolve => setTimeout(resolve, 0));
              parsedContent = JSON.stringify(parsed, null, 2);
              isBinary = false;
            } catch {
              parsedContent = content.string;
              isBinary = false;
            }
          } else if (content.binary_base64) {
            // Calculate approximate size from base64
            const b64 = content.binary_base64;
            const len = b64.length;
            const padding = (b64.endsWith("==") ? 2 : (b64.endsWith("=") ? 1 : 0));
            const sizeBytes = Math.floor((len * 3) / 4) - padding;
            isBinary = true;

            if (sizeBytes > 50 * 1024) {
              // Too large to render in editor; show metadata panel instead
              parsedContent = "";
              set({ fetchedBinaryTooLarge: { name: secret_id, size: sizeBytes } });
              // Open tab with meta indicating too-large binary
              const tabId = st2.openTab(secret_id, parsedContent, isBinary, { isTooLarge: true, binarySize: sizeBytes });
              set({
                activeTabId: tabId,
                secretId: secret_id,
                editorContent: parsedContent,
                isBinary: isBinary,
                isEditing: false,
                isCreatingNew: false,
                isFetchingSecret: false,
                fetchingSecretId: null,
              });

              // proceed to cache and recent below
              didOpenTab = true;
            } else {
              parsedContent = b64;
              set({ fetchedBinaryTooLarge: null });
              // Open tab with non-too-large binary
              const tabId = st2.openTab(secret_id, parsedContent, isBinary, { isTooLarge: false, binarySize: sizeBytes });
              set({
                activeTabId: tabId,
                secretId: secret_id,
                editorContent: parsedContent,
                isBinary: isBinary,
                isEditing: false,
                isCreatingNew: false,
                isFetchingSecret: false,
                fetchingSecretId: null,
              });
              didOpenTab = true;
            }
          } else {
            parsedContent = "";
            isBinary = false;
            set({ fetchedBinaryTooLarge: null });
          }

          // If JSON or other small content branch didn't open tab yet, open now
          if (!didOpenTab) {
            const tabId = st2.openTab(secret_id, parsedContent, isBinary, { isTooLarge: false });
            set({
              activeTabId: tabId,
              secretId: secret_id,
              editorContent: parsedContent,
              isBinary: isBinary,
              isEditing: false,
              isCreatingNew: false,
              isFetchingSecret: false,
              fetchingSecretId: null,
            });
          }

          // Yield before cache operations
          await new Promise(resolve => setTimeout(resolve, 0));

          // Yield before cache operations
          await new Promise(resolve => setTimeout(resolve, 0));

          // Update metadata cache
          const profile = st2.selectedProfile ?? st2.defaultProfile;
          const currentMetadata = st2.secretMetadata;
          if (currentMetadata[secret_id] !== isBinary) {
            currentMetadata[secret_id] = isBinary;
            set({ secretMetadata: { ...currentMetadata } });
            // Save to cache
            if (profile) {
              const cachedMetadata = await api.loadCachedSecretMetadata(profile);
              let updatedMetadata: Array<{ name: string; is_binary: boolean }>;
              if (cachedMetadata) {
                const existingIndex = cachedMetadata.findIndex(m => m.name === secret_id);
                if (existingIndex >= 0) {
                  updatedMetadata = cachedMetadata.map(m =>
                    m.name === secret_id ? { name: m.name, is_binary: isBinary } : m
                  );
                } else {
                  updatedMetadata = [...cachedMetadata, { name: secret_id, is_binary: isBinary }];
                }
              } else {
                updatedMetadata = [{ name: secret_id, is_binary: isBinary }];
              }
              await api.saveCachedSecretMetadata(profile, updatedMetadata);
            }
          }

          // Add to recent secrets
          await st2.addToRecent(secret_id);
          st2.pushSuccess("Fetched secret");
        });

        void listen<{ secret_id: string; error: string }>("secret_fetch_error", (ev) => {
          const { secret_id, error } = ev.payload;
          set({ isFetchingSecret: false, fetchingSecretId: null });
          get().pushError(`Fetch error for ${secret_id}: ${error}`);
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

    // If already fetching a different secret, clear loading state first
    if (st.isFetchingSecret && st.fetchingSecretId !== name) {
      st.pushInfo(`Cancelling previous fetch: ${st.fetchingSecretId}`);
    }

    st.pushInfo(`Fetching secret: ${name}`);
    // Clear any stale large-binary panel immediately so editor doesn't keep showing metadata
    set({ fetchedBinaryTooLarge: null, isFetchingSecret: true, fetchingSecretId: name });

    // Yield to allow UI to update loading state
    await new Promise(resolve => setTimeout(resolve, 0));

    // Start async fetch - will emit event when done
    // This doesn't block the UI thread
    try {
      await api.fetchSecretAsync(profile ?? null, name);
      // Event handler will process the result
    } catch (e) {
      set({ isFetchingSecret: false, fetchingSecretId: null });
      st.pushError(`Failed to start fetch: ${String(e)}`);
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

  openTab: (secretId: string, content: string, isBinary: boolean, meta?: { isTooLarge?: boolean; binarySize?: number }) => {
    const st = get();
    const tabId = `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newTab = { id: tabId, secretId, content, isBinary, isTooLarge: meta?.isTooLarge, binarySize: meta?.binarySize };
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
    // compute fetchedBinaryTooLarge for the new active tab
    let tooLarge: { name: string; size: number } | null = null;
    if (activeTab && activeTab.isBinary) {
      if (activeTab.isTooLarge && activeTab.binarySize) {
        tooLarge = { name: activeTab.secretId, size: activeTab.binarySize };
      } else if (activeTab.content) {
        const sizeBytes = get()._computeBase64Size(activeTab.content);
        if (sizeBytes > 50 * 1024) {
          tooLarge = { name: activeTab.secretId, size: sizeBytes };
        }
      }
    }
    set({
      tabs: newTabs,
      activeTabId: newActiveTabId,
      secretId: activeTab?.secretId ?? "",
      editorContent: activeTab?.content ?? "",
      isBinary: activeTab?.isBinary ?? false,
      isEditing: false,
      isCreatingNew: false,
      fetchedBinaryTooLarge: tooLarge,
    });
  },

  switchTab: (tabId: string) => {
    const st = get();
    const tab = st.tabs.find(t => t.id === tabId);
    if (tab) {
      let tooLarge: { name: string; size: number } | null = null;
      if (tab.isBinary) {
        if (tab.isTooLarge && tab.binarySize) {
          tooLarge = { name: tab.secretId, size: tab.binarySize };
        } else if (tab.content) {
          const sizeBytes = st._computeBase64Size(tab.content);
          if (sizeBytes > 50 * 1024) {
            tooLarge = { name: tab.secretId, size: sizeBytes };
          }
        }
      }
      set({
        activeTabId: tabId,
        secretId: tab.secretId,
        editorContent: tab.content,
        isBinary: tab.isBinary,
        isEditing: false,
        isCreatingNew: false,
        fetchedBinaryTooLarge: tooLarge,
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


