import { create } from "zustand";
import { listen } from "@tauri-apps/api/event";
import { api } from "../services/tauriApi";

type State = {
  profiles: string[];
  selectedProfile: string | null;
  defaultProfile: string | null;
  ssoValid: boolean | null;
  ssoChecking: boolean;
  _eventsBound: boolean;
};

type Actions = {
  initLoad: (pushError: (msg: string) => void, pushSuccess: (msg: string) => void, onSecretsLoad?: (profile: string) => Promise<void>) => Promise<void>;
  setSelectedProfile: (p: string | null) => void;
  saveDefault: (pushSuccess: (msg: string) => void) => Promise<void>;
  checkSsoFlow: (pushWarn: (msg: string) => void, pushInfo: (msg: string) => void, pushSuccess: (msg: string) => void, pushError: (msg: string) => void) => Promise<boolean>;
  triggerSsoLogin: (pushWarn: (msg: string) => void, pushInfo: (msg: string) => void, pushError: (msg: string) => void) => Promise<void>;
};

export const useProfileStore = create<State & Actions>((set, get) => ({
  profiles: [],
  selectedProfile: null,
  defaultProfile: null,
  ssoValid: null,
  ssoChecking: false,
  _eventsBound: false,

  setSelectedProfile: (p) => set({ selectedProfile: p }),

  initLoad: async (pushError, pushSuccess, onSecretsLoad) => {
    try {
      const df = await api.loadDefaultProfile();
      set({ defaultProfile: df });
      const ps = await api.loadProfiles();
      set({ profiles: ps });
      
      if (df) {
        const cached = await api.loadCachedSecretNames(df);
        if (cached && cached.length > 0) {
          pushSuccess(`Loaded ${cached.length} cached secrets`);
          
          // Callback để load secrets list vào SecretsListStore
          if (onSecretsLoad) {
            await onSecretsLoad(df);
          }
        }
      }

      // Bind event listeners once
      const st = get();
      if (!st._eventsBound) {
        void listen<string>("sso_login_ok", async (ev) => {
          set({ ssoValid: true, ssoChecking: false });
          pushSuccess(`SSO login ok${ev.payload ? ` for ${ev.payload}` : ""}`);
        });
        void listen("sso_login_timeout", () => {
          set({ ssoValid: false, ssoChecking: false });
          pushSuccess("SSO login timeout");
        });

        set({ _eventsBound: true });
      }

      // Initial SSO check on app start
      const st2 = get();
      if (st2.selectedProfile ?? st2.defaultProfile) {
        void st2.checkSsoFlow(() => {}, () => {}, pushSuccess, pushError);
      }
    } catch (e) {
      pushError(`Init error: ${String(e)}`);
    }
  },

  saveDefault: async (pushSuccess) => {
    const st = get();
    await api.saveDefaultProfile(st.selectedProfile ?? "default");
    set({ defaultProfile: st.selectedProfile });
    pushSuccess("Saved default profile");
  },

  checkSsoFlow: async (pushWarn, pushInfo, pushSuccess, pushError) => {
    const st = get();
    const profile = st.selectedProfile ?? st.defaultProfile;
    if (!profile) {
      pushWarn("No profile selected");
      return false;
    }
    set({ ssoChecking: true });
    pushInfo("Checking SSO...");
    try {
      const ok = await api.checkSso(profile);
      if (ok) {
        set({ ssoValid: true, ssoChecking: false });
        pushSuccess("SSO valid");
        return true;
      }
      set({ ssoValid: false, ssoChecking: false });
      pushWarn("SSO invalid");
      return false;
    } catch (e) {
      const msg = typeof e === 'string' ? e : (e as any)?.message ?? 'SSO check failed';
      set({ ssoValid: false, ssoChecking: false });
      pushError(String(msg));
      return false;
    }
  },

  triggerSsoLogin: async (pushWarn, pushInfo, pushError) => {
    const st = get();
    const profile = st.selectedProfile ?? st.defaultProfile;
    if (!profile) {
      pushWarn("No profile selected");
      return;
    }
    try {
      await api.triggerSsoLogin(profile);
      pushInfo("Opened SSO login in browser...");
    } catch (e) {
      pushError(`Cannot open SSO login: ${String(e)}`);
    }
  },
}));

