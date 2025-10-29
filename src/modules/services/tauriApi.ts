import { invoke } from "@tauri-apps/api/core";

export type SecretContent = { string: string | null; binary_base64: string | null };
export type SecretMetadata = { name: string; is_binary: boolean };

export const api = {
  loadProfiles: () => invoke<string[]>("load_profiles"),
  loadDefaultProfile: () => invoke<string | null>("load_default_profile"),
  saveDefaultProfile: (profile: string) => invoke<boolean>("save_default_profile", { profile }),
  loadCachedSecretNames: (profile: string) => invoke<string[] | null>("load_cached_secret_names", { profile }),
  saveCachedSecretNames: (profile: string, names: string[]) => invoke<boolean>("save_cached_secret_names", { profile, names }),
  loadCachedSecretMetadata: (profile: string) => invoke<SecretMetadata[] | null>("load_cached_secret_metadata", { profile }),
  saveCachedSecretMetadata: (profile: string, metadata: SecretMetadata[]) => invoke<boolean>("save_cached_secret_metadata", { profile, metadata }),

  listSecrets: (profile?: string | null) => invoke<string[]>("list_secrets", { profile: profile ?? null }),
  listSecretsWithMetadata: (profile?: string | null) => invoke<SecretMetadata[]>("list_secrets_with_metadata", { profile: profile ?? null }),
  fetchSecret: (profile: string | null | undefined, secretId: string) =>
    invoke<SecretContent>("fetch_secret", { profile: profile ?? null, secretId }),
  fetchSecretAsync: (profile: string | null | undefined, secretId: string) =>
    invoke<boolean>("fetch_secret_async", { profile: profile ?? null, secretId }),
  createSecret: (
    profile: string | null | undefined,
    secretId: string,
    secretValue: string,
    description?: string | null,
    isBinary?: boolean,
  ) => invoke<string>("create_secret", { profile: profile ?? null, secretId, secretValue, description: description ?? null, isBinary: isBinary ?? false }),
  updateSecret: (
    profile: string | null | undefined,
    secretId: string,
    secretValue: string,
    description?: string | null,
    isBinary?: boolean,
  ) => invoke<string>("update_secret", { profile: profile ?? null, secretId, secretValue, description: description ?? null, isBinary: isBinary ?? false }),
  checkSso: (profile: string) => invoke<boolean>("check_sso", { profile }),
  triggerSsoLogin: (profile: string) => invoke<boolean>("trigger_sso_login", { profile }),
  loadTheme: () => invoke<string | null>("load_theme"),
  saveTheme: (theme: string) => invoke<boolean>("save_theme", { theme }),
  loadBookmarks: () => invoke<string[] | null>("load_bookmarks"),
  saveBookmarks: (bookmarks: string[]) => invoke<boolean>("save_bookmarks", { bookmarks }),
  loadRecentSecrets: () => invoke<string[] | null>("load_recent_secrets"),
  saveRecentSecrets: (recent: string[]) => invoke<boolean>("save_recent_secrets", { recent }),
};


