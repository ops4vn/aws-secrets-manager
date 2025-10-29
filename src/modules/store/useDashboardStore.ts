import { create } from "zustand";
import { api, SecretContent } from "../services/tauriApi";

type State = {
  // profiles
  profiles: string[];
  selectedProfile: string | null;
  defaultProfile: string | null;

  // ui
  showSecretsTree: boolean;
  searchQuery: string;
  status: string;

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

  // sso
  ssoValid: boolean | null;
  ssoChecking: boolean;
};

type Actions = {
  initLoad: () => Promise<void>;
  setSelectedProfile: (p: string | null) => void;
  setSearchQuery: (q: string) => void;
  setShowSecretsTree: (v: boolean) => void;
  setStatus: (s: string) => void;

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

  // secrets
  fetchSecretById: (name: string) => Promise<void>;
  startEdit: () => void;
  startCreateNew: () => void;
  setEditorContent: (v: string) => void;
  save: () => Promise<void>;
  cancelEdit: () => void;
  setSecretId: (v: string) => void;
};

export const useDashboardStore = create<State & Actions>((set, get) => ({
  profiles: [],
  selectedProfile: null,
  defaultProfile: null,

  showSecretsTree: false,
  searchQuery: "",
  status: "",

  logs: [],
  autoScrollLogs: true,

  secretId: "",
  editorContent: "",
  isEditing: false,
  isCreatingNew: false,
  isBinary: false,
  allNames: [],

  ssoValid: null,
  ssoChecking: false,

  setStatus: (s) => set({ status: s }),
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
  setEditorContent: (v) => set({ editorContent: v }),
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
          set({ allNames: cached, showSecretsTree: true, status: `Loaded ${cached.length} cached secrets` });
          get().pushSuccess(`Loaded ${cached.length} cached secrets`);
        }
      }
    } catch (e) {
      set({ status: `Init error: ${String(e)}` });
    }
  },

  saveDefault: async () => {
    const st = get();
    await api.saveDefaultProfile(st.selectedProfile ?? "default");
    set({ defaultProfile: st.selectedProfile });
    set({ status: "Saved default profile" });
    st.pushSuccess("Saved default profile");
  },

  listSecrets: async (force = false) => {
    const st = get();
    const profile = st.selectedProfile ?? st.defaultProfile;
    set({ showSecretsTree: true });
    if (!profile) {
      set({ status: "No profile selected" });
      st.pushWarn("No profile selected");
      return;
    }
    if (!force) {
      set({ status: "Listing secrets..." });
      st.pushInfo("Listing secrets...");
      const cached = await api.loadCachedSecretNames(profile);
      if (cached && cached.length) {
        set({ allNames: cached, status: `Loaded ${cached.length} cached secrets` });
        st.pushSuccess(`Loaded ${cached.length} cached secrets`);
        return;
      }
    } else {
      set({ status: "Reloading secrets from AWS..." });
      st.pushWarn("Force reloading secrets...");
    }
    const names = await api.listSecrets(profile);
    await api.saveCachedSecretNames(profile, names);
    set({ allNames: names, status: `Loaded ${names.length} secrets` });
    st.pushSuccess(`Loaded ${names.length} secrets`);
  },

  checkSsoFlow: async () => {
    const st = get();
    const profile = st.selectedProfile ?? st.defaultProfile;
    if (!profile) {
      set({ status: "No profile selected" });
      st.pushWarn("No profile selected");
      return false;
    }
    set({ ssoChecking: true, status: "Checking SSO..." });
    st.pushInfo("Checking SSO...");
    const ok = await api.checkSso(profile);
    if (ok) {
      set({ ssoValid: true, ssoChecking: false, status: "SSO valid" });
      st.pushSuccess("SSO valid");
      return true;
    }
    await api.triggerSsoLogin(profile);
    set({ status: "Opened SSO login in browser..." });
    st.pushInfo("Opened SSO login in browser...");
    let valid = false;
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      if (await api.checkSso(profile)) {
        valid = true;
        break;
      }
    }
    set({ ssoValid: valid, ssoChecking: false, status: valid ? "SSO valid" : "SSO still invalid after waiting" });
    if (valid) st.pushSuccess("SSO valid"); else st.pushWarn("SSO still invalid after waiting");
    return valid;
  },

  fetchSecretById: async (name: string) => {
    const st = get();
    const profile = st.selectedProfile ?? st.defaultProfile;
    set({ status: `Fetching secret: ${name}` });
    st.pushInfo(`Fetching secret: ${name}`);
    try {
      const res: SecretContent = await api.fetchSecret(profile ?? null, name);
      if (res.string) {
        try {
          const parsed = JSON.parse(res.string);
          set({ editorContent: JSON.stringify(parsed, null, 2), isBinary: false });
        } catch {
          set({ editorContent: res.string, isBinary: false });
        }
      } else if (res.binary_base64) {
        set({ editorContent: res.binary_base64, isBinary: true });
      } else {
        set({ editorContent: "", isBinary: false });
      }
      set({ isEditing: false, isCreatingNew: false, status: res.string ? "Fetched string secret" : res.binary_base64 ? "Fetched binary secret (base64)" : "Empty secret" });
      st.pushSuccess("Fetched secret");
    } catch (e) {
      set({ editorContent: "", isBinary: false, isEditing: false, isCreatingNew: false, status: `Error: ${String(e)}` });
      st.pushError(`Fetch error: ${String(e)}`);
    }
  },

  startEdit: () => {
    set({ isEditing: true, isCreatingNew: false, status: "Edit mode enabled" });
    get().pushInfo("Switched to edit mode");
  },
  startCreateNew: () => {
    set({ isCreatingNew: true, isEditing: true, editorContent: "", secretId: "", status: "Create new secret mode" });
    get().pushInfo("Switched to create new secret mode");
  },
  save: async () => {
    const st = get();
    const profile = st.selectedProfile ?? st.defaultProfile;
    set({ status: st.isCreatingNew ? "Creating secret..." : "Updating secret..." });
    st.pushInfo((st.isCreatingNew ? "Creating" : "Updating") + ` secret: ${st.secretId}`);
    if (st.isCreatingNew) {
      await api.createSecret(profile, st.secretId, st.editorContent);
      set({ status: "Created secret" });
      st.pushSuccess("Created secret");
    } else {
      await api.updateSecret(profile, st.secretId, st.editorContent);
      set({ status: "Updated secret" });
      st.pushSuccess("Updated secret");
    }
    set({ isEditing: false, isCreatingNew: false });
  },
  cancelEdit: () => {
    set({ isEditing: false, isCreatingNew: false, status: "Edit cancelled" });
    get().pushInfo("Edit mode cancelled");
  },
}));


