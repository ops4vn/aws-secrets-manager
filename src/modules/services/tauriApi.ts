import { invoke } from "@tauri-apps/api/core";

export type SecretContent = { string: string | null; binary_base64: string | null };
export type SecretMetadata = { name: string; is_binary: boolean };
export type SecretTag = { key: string; value: string };
export type SecretDescription = {
  arn: string | null;
  name: string | null;
  description: string | null;
  // Dates are epoch seconds (multiply by 1000 for Date()).
  created_date: number | null;
  last_changed_date: number | null;
  last_accessed_date: number | null;
  last_rotated_date: number | null;
  next_rotation_date: number | null;
  deleted_date: number | null;
  rotation_enabled: boolean | null;
  rotation_lambda_arn: string | null;
  rotation_automatically_after_days: number | null;
  primary_region: string | null;
  tags: SecretTag[];
};
export type SecretVersion = {
  version_id: string;
  version_stages: string[];
  created_date: number | null;
  last_accessed_date: number | null;
};

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
  deleteSecret: (
    profile: string | null | undefined,
    secretId: string,
  ) => invoke<string>("delete_secret", { profile: profile ?? null, secretId }),
  listDeletedSecrets: (profile?: string | null) => invoke<string[]>("list_deleted_secrets", { profile: profile ?? null }),
  restoreSecret: (
    profile: string | null | undefined,
    secretId: string,
  ) => invoke<string>("restore_secret", { profile: profile ?? null, secretId }),
  describeSecret: (profile: string | null | undefined, secretId: string) =>
    invoke<SecretDescription>("describe_secret", { profile: profile ?? null, secretId }),
  tagSecret: (profile: string | null | undefined, secretId: string, tags: SecretTag[]) =>
    invoke<string>("tag_secret", { profile: profile ?? null, secretId, tags }),
  untagSecret: (profile: string | null | undefined, secretId: string, keys: string[]) =>
    invoke<string>("untag_secret", { profile: profile ?? null, secretId, keys }),
  listSecretVersions: (profile: string | null | undefined, secretId: string) =>
    invoke<SecretVersion[]>("list_secret_versions", { profile: profile ?? null, secretId }),
  fetchSecretVersion: (profile: string | null | undefined, secretId: string, versionId: string) =>
    invoke<SecretContent>("fetch_secret_version", { profile: profile ?? null, secretId, versionId }),
  checkSso: (profile: string) => invoke<boolean>("check_sso", { profile }),
  triggerSsoLogin: (profile: string) => invoke<boolean>("trigger_sso_login", { profile }),
  loadTheme: () => invoke<string | null>("load_theme"),
  saveTheme: (theme: string) => invoke<boolean>("save_theme", { theme }),
  loadBookmarks: (profile: string) => invoke<string[] | null>("load_bookmarks", { profile }),
  saveBookmarks: (profile: string, bookmarks: string[]) => invoke<boolean>("save_bookmarks", { profile, bookmarks }),
  loadRecentSecrets: () => invoke<string[] | null>("load_recent_secrets"),
  saveRecentSecrets: (recent: string[]) => invoke<boolean>("save_recent_secrets", { recent }),
};


