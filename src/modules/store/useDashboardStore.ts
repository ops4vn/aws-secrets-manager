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

  // sso
  ssoValid: boolean | null;
  ssoChecking: boolean;
  _eventsBound: boolean;
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
  _eventsBound: false,

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
          set({ allNames: cached, showSecretsTree: true });
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
      set({ isEditing: false, isCreatingNew: false });
      st.pushSuccess("Fetched secret");
    } catch (e) {
      set({ editorContent: "", isBinary: false, isEditing: false, isCreatingNew: false });
      st.pushError(`Fetch error: ${String(e)}`);
    }
  },

  startEdit: () => {
    set({ isEditing: true, isCreatingNew: false });
    get().pushInfo("Switched to edit mode");
  },
  startCreateNew: () => {
    set({ isCreatingNew: true, isEditing: true, editorContent: "", secretId: "" });
    get().pushInfo("Switched to create new secret mode");
  },
  save: async () => {
    const st = get();
    const profile = st.selectedProfile ?? st.defaultProfile;
    st.pushInfo((st.isCreatingNew ? "Creating" : "Updating") + ` secret: ${st.secretId}`);
    if (st.isCreatingNew) {
      await api.createSecret(profile, st.secretId, st.editorContent);
      st.pushSuccess("Created secret");
    } else {
      await api.updateSecret(profile, st.secretId, st.editorContent);
      st.pushSuccess("Updated secret");
    }
    set({ isEditing: false, isCreatingNew: false });
  },
  cancelEdit: () => {
    set({ isEditing: false, isCreatingNew: false });
    get().pushInfo("Edit mode cancelled");
  },
}));


