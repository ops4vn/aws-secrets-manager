use anyhow::Result;
use aws_config::profile::load as load_profiles;
use aws_runtime::env_config::file::EnvConfigFiles;
use aws_types::os_shim_internal::{Env, Fs};
use serde_json::Value as JsonValue;

pub struct Config;

impl Config {
    pub async fn load_profiles() -> Result<Vec<String>> {
        let fs = Fs::real();
        let env = Env::real();
        let profile_files = EnvConfigFiles::builder()
            .include_default_config_file(true)
            .include_default_credentials_file(true)
            .build();
        let profile_set = load_profiles(&fs, &env, &profile_files, None).await?;
        Ok(profile_set.profiles().map(str::to_string).collect())
    }

    fn config_store_path() -> Option<std::path::PathBuf> {
        let dir = dirs::config_dir()?;
        Some(dir.join("secmanager").join("settings.json"))
    }

    pub fn load_default_profile() -> Option<String> {
        let path = Self::config_store_path()?;
        let data = std::fs::read_to_string(path).ok()?;
        let v: JsonValue = serde_json::from_str(&data).ok()?;
        v.get("default_profile")
            .and_then(|s| s.as_str())
            .map(|s| s.to_string())
    }

    pub fn save_default_profile(profile: &str) {
        if let Some(path) = Self::config_store_path() {
            let _ = std::fs::create_dir_all(path.parent().unwrap());
            let data = serde_json::json!({ "default_profile": profile });
            let _ = std::fs::write(path, serde_json::to_vec(&data).unwrap_or_default());
        }
    }

    fn cache_dir() -> Option<std::path::PathBuf> {
        let dir = dirs::config_dir()?;
        Some(dir.join("secmanager"))
    }

    fn secrets_cache_path(profile: &str) -> Option<std::path::PathBuf> {
        let dir = Self::cache_dir()?;
        Some(dir.join(format!("secrets_{profile}.json")))
    }

    pub fn load_cached_secret_names(profile: &str) -> Option<Vec<String>> {
        let path = Self::secrets_cache_path(profile)?;
        let data = std::fs::read_to_string(path).ok()?;
        serde_json::from_str::<Vec<String>>(&data).ok()
    }

    pub fn save_cached_secret_names(profile: &str, names: &[String]) {
        if let Some(path) = Self::secrets_cache_path(profile) {
            let _ = std::fs::create_dir_all(path.parent().unwrap());
            let _ = std::fs::write(path, serde_json::to_vec_pretty(names).unwrap_or_default());
        }
    }
}
