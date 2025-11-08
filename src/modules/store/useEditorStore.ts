import { create } from "zustand";
import { listen } from "@tauri-apps/api/event";
import { api, SecretContent } from "../services/tauriApi";
import type { EditorTab } from "../shared/types";
import { useLogsStore } from "./useLogsStore";
import { useSecretsListStore } from "./useSecretsListStore";
import { useBookmarksStore } from "./useBookmarksStore";
import { useProfileStore } from "./useProfileStore";

type State = {
  // editor
  secretId: string;
  editorContent: string;
  isEditing: boolean;
  isCreatingNew: boolean;
  isBinary: boolean;
  importedBinary: { name: string; size: number; base64: string } | null;

  // loading
  isFetchingSecret: boolean;
  fetchingSecretId: string | null;

  // fetched large binary (do not render content)
  fetchedBinaryTooLarge: { name: string; size: number } | null;

  // tabs
  tabs: EditorTab[];
  activeTabId: string | null;

  // internal
  _eventsBound: boolean;
};

type Actions = {
  // editor actions
  fetchSecretById: (name: string, profile: string | null) => Promise<void>;
  startEdit: () => void;
  startCreateNew: () => void;
  setEditorContent: (v: string) => void;
  setIsBinary: (v: boolean) => void;
  setImportedBinary: (p: { name: string; size: number; base64: string } | null) => void;
  save: (profile: string | null) => Promise<void>;
  cancelEdit: () => void;
  setSecretId: (v: string) => void;
  _computeBase64Size: (b64: string) => number;

  // tabs
  openTab: (secretId: string, content: string, isBinary: boolean, meta?: { isTooLarge?: boolean; binarySize?: number }) => string;
  closeTab: (tabId: string) => void;
  closeOtherTabs: (tabId: string) => void;
  switchTab: (tabId: string) => void;

  // init
  bindEvents: () => void;
};

export const useEditorStore = create<State & Actions>((set, get) => ({
  secretId: "",
  editorContent: "",
  isEditing: false,
  isCreatingNew: false,
  isBinary: false,
  importedBinary: null,

  isFetchingSecret: false,
  fetchingSecretId: null,
  fetchedBinaryTooLarge: null,

  tabs: [],
  activeTabId: null,

  _eventsBound: false,

  setEditorContent: (v) => {
    const st = get();
    set({ editorContent: v });
    // Sync với tab active, nhưng không sync khi đang tạo secret mới (import file)
    // vì khi import file, content của file không nên ghi đè content của tab hiện tại
    if (st.activeTabId && !st.isCreatingNew) {
      const updatedTabs = st.tabs.map(t =>
        t.id === st.activeTabId ? { ...t, content: v } : t
      );
      set({ tabs: updatedTabs });
    }
  },

  setIsBinary: (v) => set({ isBinary: v }),
  setImportedBinary: (p) => set({ importedBinary: p }),
  setSecretId: (v) => set({ secretId: v }),

  _computeBase64Size: (b64: string): number => {
    const len = b64.length;
    const padding = (b64.endsWith("==") ? 2 : (b64.endsWith("=") ? 1 : 0));
    return Math.floor((len * 3) / 4) - padding;
  },

  bindEvents: () => {
    const st = get();
    if (st._eventsBound) return;

    const { pushWarn, pushError, pushSuccess } = useLogsStore.getState();
    const { updateSecretMetadata } = useSecretsListStore.getState();
    const { addToRecent } = useBookmarksStore.getState();

    void listen<{ secret_id: string; content: SecretContent }>("secret_fetch_ok", async (ev) => {
      const { secret_id, content } = ev.payload;
      const st3 = get();

      if (st3.isFetchingSecret && st3.fetchingSecretId !== secret_id) {
        pushWarn(`Ignoring fetch result for ${secret_id} (now fetching ${st3.fetchingSecretId})`);
        return;
      }

      await new Promise(resolve => setTimeout(resolve, 0));

      const st2 = get();
      let parsedContent = "";
      let isBinary = false;
      let didOpenTab = false;

      if (content.string) {
        await new Promise(resolve => setTimeout(resolve, 0));

        try {
          const parsed = JSON.parse(content.string);
          await new Promise(resolve => setTimeout(resolve, 0));
          parsedContent = JSON.stringify(parsed, null, 2);
          isBinary = false;
        } catch {
          parsedContent = content.string;
          isBinary = false;
        }
      } else if (content.binary_base64) {
        const b64 = content.binary_base64;
        const len = b64.length;
        const padding = (b64.endsWith("==") ? 2 : (b64.endsWith("=") ? 1 : 0));
        const sizeBytes = Math.floor((len * 3) / 4) - padding;
        isBinary = true;

        if (sizeBytes > 50 * 1024) {
          parsedContent = "";
          set({ fetchedBinaryTooLarge: { name: secret_id, size: sizeBytes } });
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
          didOpenTab = true;
        } else {
          parsedContent = b64;
          set({ fetchedBinaryTooLarge: null });
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

      await new Promise(resolve => setTimeout(resolve, 0));
      const profile = useProfileStore.getState().selectedProfile ?? useProfileStore.getState().defaultProfile;
      await updateSecretMetadata(profile, secret_id, isBinary);
      await addToRecent(secret_id);
      pushSuccess("Fetched secret");
    });

    void listen<{ secret_id: string; error: string }>("secret_fetch_error", (ev) => {
      const { secret_id, error } = ev.payload;
      set({ isFetchingSecret: false, fetchingSecretId: null });
      pushError(`Fetch error for ${secret_id}: ${error}`);
    });

    set({ _eventsBound: true });
  },

  fetchSecretById: async (name: string, profile: string | null) => {
    const st = get();
    const { pushInfo, pushError } = useLogsStore.getState();

    // Bind events nếu chưa bind
    if (!st._eventsBound) {
      st.bindEvents();
    }

    // Kiểm tra xem secret đã có trong tab chưa
    const existingTab = st.tabs.find(t => t.secretId === name);
    if (existingTab) {
      st.switchTab(existingTab.id);
      pushInfo(`Switched to existing tab: ${name}`);
      return;
    }

    if (st.isFetchingSecret && st.fetchingSecretId !== name) {
      pushInfo(`Cancelling previous fetch: ${st.fetchingSecretId}`);
    }

    pushInfo(`Fetching secret: ${name}`);
    set({ fetchedBinaryTooLarge: null, isFetchingSecret: true, fetchingSecretId: name });

    await new Promise(resolve => setTimeout(resolve, 0));

    try {
      await api.fetchSecretAsync(profile, name);
    } catch (e) {
      set({ isFetchingSecret: false, fetchingSecretId: null });
      pushError(`Failed to start fetch: ${String(e)}`);
    }
  },

  startEdit: () => {
    const { pushInfo } = useLogsStore.getState();
    set({ isEditing: true, isCreatingNew: false });
    pushInfo("Switched to edit mode");
  },

  startCreateNew: () => {
    const st = get();
    const { pushInfo } = useLogsStore.getState();
    
    // Lưu content hiện tại vào tab active trước khi clear (nếu có tab active)
    if (st.activeTabId) {
      const updatedTabs = st.tabs.map(t =>
        t.id === st.activeTabId ? { ...t, content: st.editorContent } : t
      );
      set({ tabs: updatedTabs });
    }
    
    // Set content mặc định là JSON với cursor ở giữa dấu ngoặc kép
    const defaultContent = '{\n  ""\n}';
    set({ isCreatingNew: true, isEditing: true, editorContent: defaultContent, secretId: "", importedBinary: null, isBinary: false });
    pushInfo("Switched to create new secret mode");
  },

  save: async (profile: string | null) => {
    const st = get();
    const { pushInfo, pushSuccess, pushError } = useLogsStore.getState();
    const { listSecrets } = useSecretsListStore.getState();
    pushInfo((st.isCreatingNew ? "Creating" : "Updating") + ` secret: ${st.secretId}`);
    
    try {
      if (st.isCreatingNew) {
        const payload = st.isBinary ? (st.importedBinary?.base64 ?? st.editorContent) : st.editorContent;
        await api.createSecret(profile, st.secretId, payload, null, st.isBinary);
        pushSuccess("Created secret");
        
        // Force reload secrets list after creating new secret
        await listSecrets(profile, true);
      } else {
        const payload = st.isBinary ? (st.importedBinary?.base64 ?? st.editorContent) : st.editorContent;
        await api.updateSecret(profile, st.secretId, payload, null, st.isBinary);
        pushSuccess("Updated secret");
      }

      // Cập nhật content trong tab sau khi save
      if (st.activeTabId) {
        const updatedTabs = st.tabs.map(t =>
          t.id === st.activeTabId ? { ...t, content: st.editorContent, isBinary: st.isBinary } : t
        );
        set({ tabs: updatedTabs });
      }

      set({ isEditing: false, isCreatingNew: false, importedBinary: null });
    } catch (error) {
      const errorMsg = typeof error === 'string' ? error : (error as any)?.message ?? String(error);
      pushError(`Failed to ${st.isCreatingNew ? 'create' : 'update'} secret: ${errorMsg}`);
      // Không reset editing state khi có lỗi để user có thể sửa và thử lại
    }
  },

  cancelEdit: () => {
    const st = get();
    const { pushInfo } = useLogsStore.getState();
    if (st.activeTabId) {
      const tab = st.tabs.find(t => t.id === st.activeTabId);
      if (tab) {
        // Restore tất cả state từ tab
        let tooLarge: { name: string; size: number } | null = null;
        if (tab.isBinary) {
          if (tab.isTooLarge && tab.binarySize) {
            tooLarge = { name: tab.secretId, size: tab.binarySize };
          } else if (tab.content) {
            const sizeBytes = st._computeBase64Size(tab.content);
            if (sizeBytes > 50 * 1024) {
              tooLarge = { name: tab.secretId, size: tab.binarySize ?? 0 };
            }
          }
        }
        set({
          editorContent: tab.content,
          secretId: tab.secretId,
          isBinary: tab.isBinary,
          isEditing: false,
          isCreatingNew: false,
          importedBinary: null,
          fetchedBinaryTooLarge: tooLarge,
        });
      }
    } else {
      set({ isEditing: false, isCreatingNew: false, importedBinary: null });
    }
    pushInfo("Edit mode cancelled");
  },

  openTab: (secretId: string, content: string, isBinary: boolean, meta?: { isTooLarge?: boolean; binarySize?: number }) => {
    const st = get();
    const tabId = `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newTab: EditorTab = { id: tabId, secretId, content, isBinary, isTooLarge: meta?.isTooLarge, binarySize: meta?.binarySize };
    set({ tabs: [...st.tabs, newTab], activeTabId: tabId });
    return tabId;
  },

  closeTab: (tabId: string) => {
    const st = get();
    const newTabs = st.tabs.filter(t => t.id !== tabId);
    let newActiveTabId: string | null = null;

    if (st.activeTabId === tabId) {
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

  closeOtherTabs: (tabId: string) => {
    const st = get();
    const tabToKeep = st.tabs.find(t => t.id === tabId);
    if (!tabToKeep) return;

    const newTabs = [tabToKeep];
    set({
      tabs: newTabs,
      activeTabId: tabId,
      secretId: tabToKeep.secretId,
      editorContent: tabToKeep.content,
      isBinary: tabToKeep.isBinary,
      isEditing: false,
      isCreatingNew: false,
    });

    let tooLarge: { name: string; size: number } | null = null;
    if (tabToKeep.isBinary) {
      if (tabToKeep.isTooLarge && tabToKeep.binarySize) {
        tooLarge = { name: tabToKeep.secretId, size: tabToKeep.binarySize };
      } else if (tabToKeep.content) {
        const sizeBytes = st._computeBase64Size(tabToKeep.content);
        if (sizeBytes > 50 * 1024) {
          tooLarge = { name: tabToKeep.secretId, size: tabToKeep.binarySize ?? 0 };
        }
      }
    }
    set({ fetchedBinaryTooLarge: tooLarge });
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
            tooLarge = { name: tab.secretId, size: tab.binarySize ?? 0 };
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
}));

