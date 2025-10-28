import { invoke } from "@tauri-apps/api/core";

export type SecretContent = { string: string | null; binary_base64: string | null };

export const api = {
  loadProfiles: () => invoke<string[]>("load_profiles"),
  loadDefaultProfile: () => invoke<string | null>("load_default_profile"),
  saveDefaultProfile: (profile: string) => invoke<boolean>("save_default_profile", { profile }),
  loadCachedSecretNames: (profile: string) => invoke<string[] | null>("load_cached_secret_names", { profile }),
  saveCachedSecretNames: (profile: string, names: string[]) => invoke<boolean>("save_cached_secret_names", { profile, names }),

  listSecrets: (profile?: string | null) => invoke<string[]>("list_secrets", { profile: profile ?? null }),
  fetchSecret: (profile: string | null | undefined, secretId: string) =>
    invoke<SecretContent>("fetch_secret", { profile: profile ?? null, secretId }),
  createSecret: (
    profile: string | null | undefined,
    secretId: string,
    secretValue: string,
    description?: string | null,
  ) => invoke<string>("create_secret", { profile: profile ?? null, secretId, secretValue, description: description ?? null }),
  updateSecret: (
    profile: string | null | undefined,
    secretId: string,
    secretValue: string,
    description?: string | null,
  ) => invoke<string>("update_secret", { profile: profile ?? null, secretId, secretValue, description: description ?? null }),
  checkSso: (profile: string) => invoke<boolean>("check_sso", { profile }),
  triggerSsoLogin: (profile: string) => invoke<boolean>("trigger_sso_login", { profile }),
  loadTheme: () => invoke<string | null>("load_theme"),
  saveTheme: (theme: string) => invoke<boolean>("save_theme", { theme }),
};


