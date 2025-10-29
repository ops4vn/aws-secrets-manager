use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Serialize, Deserialize, Clone)]
pub struct SecretMetadata {
    pub name: String,
    pub is_binary: bool,
}

// ==== Types shared to FE ====
#[derive(Serialize, Deserialize, Clone)]
pub struct SecretContent {
    pub string: Option<String>,
    pub binary_base64: Option<String>,
}

// ==== Config (cache + default profile) ====
fn config_store_path() -> Option<PathBuf> {
    let dir = dirs::config_dir()?;
    Some(dir.join("secmanager").join("settings.json"))
}

fn cache_path(profile: &str) -> Option<PathBuf> {
    let dir = dirs::config_dir()?;
    Some(
        dir.join("secmanager")
            .join(format!("secrets_{}.json", profile)),
    )
}

fn metadata_cache_path(profile: &str) -> Option<PathBuf> {
    let dir = dirs::config_dir()?;
    Some(
        dir.join("secmanager")
            .join(format!("secrets_meta_{}.json", profile)),
    )
}

#[tauri::command]
pub fn load_default_profile() -> Option<String> {
    let path = config_store_path()?;
    let data = fs::read_to_string(path).ok()?;
    let v: serde_json::Value = serde_json::from_str(&data).ok()?;
    v.get("default_profile")
        .and_then(|s| s.as_str())
        .map(|s| s.to_string())
}

#[tauri::command]
pub fn save_default_profile(profile: &str) -> bool {
    if let Some(path) = config_store_path() {
        let _ = fs::create_dir_all(path.parent().unwrap());
        let data = serde_json::json!({ "default_profile": profile });
        return fs::write(path, serde_json::to_vec(&data).unwrap_or_default()).is_ok();
    }
    false
}

#[tauri::command]
pub fn load_theme() -> Option<String> {
    let path = config_store_path()?;
    let data = fs::read_to_string(path).ok()?;
    let v: serde_json::Value = serde_json::from_str(&data).ok()?;
    v.get("theme")
        .and_then(|s| s.as_str())
        .map(|s| s.to_string())
}

#[tauri::command]
pub fn save_theme(theme: &str) -> bool {
    let path = match config_store_path() {
        Some(p) => p,
        None => return false,
    };
    let _ = fs::create_dir_all(path.parent().unwrap());
    let mut root = serde_json::json!({});
    if let Ok(existing) = fs::read_to_string(&path) {
        if let Ok(mut v) = serde_json::from_str::<serde_json::Value>(&existing) {
            v["theme"] = serde_json::Value::String(theme.to_string());
            root = v;
        }
    }
    if root.get("theme").is_none() {
        root["theme"] = serde_json::Value::String(theme.to_string());
    }
    fs::write(&path, serde_json::to_vec_pretty(&root).unwrap_or_default()).is_ok()
}

#[tauri::command]
pub fn load_cached_secret_names(profile: &str) -> Option<Vec<String>> {
    // Backward compatibility: try loading metadata first, fallback to old format
    if let Some(path) = cache_path(profile) {
        if let Ok(data) = fs::read_to_string(&path) {
            // Try metadata format first
            if let Ok(metadata) = serde_json::from_str::<Vec<SecretMetadata>>(&data) {
                return Some(metadata.iter().map(|m| m.name.clone()).collect());
            }
            // Fallback to old format
            if let Ok(names) = serde_json::from_str::<Vec<String>>(&data) {
                return Some(names);
            }
        }
    }
    None
}

#[tauri::command]
pub fn load_cached_secret_metadata(profile: &str) -> Option<Vec<SecretMetadata>> {
    let path = metadata_cache_path(profile)?;
    let data = fs::read_to_string(path).ok()?;
    // Only load metadata format (with actual fetch data)
    // Do NOT convert old format to metadata - we only want metadata from actual fetches
    serde_json::from_str::<Vec<SecretMetadata>>(&data).ok()
}

#[tauri::command]
pub fn save_cached_secret_names(profile: &str, names: Vec<String>) -> bool {
    if let Some(path) = cache_path(profile) {
        let _ = fs::create_dir_all(path.parent().unwrap());
        return fs::write(path, serde_json::to_vec_pretty(&names).unwrap_or_default()).is_ok();
    }
    false
}

#[tauri::command]
pub fn save_cached_secret_metadata(profile: &str, metadata: Vec<SecretMetadata>) -> bool {
    if let Some(path) = metadata_cache_path(profile) {
        let _ = fs::create_dir_all(path.parent().unwrap());
        return fs::write(
            path,
            serde_json::to_vec_pretty(&metadata).unwrap_or_default(),
        )
        .is_ok();
    }
    false
}

fn bookmarks_path() -> Option<PathBuf> {
    let dir = dirs::config_dir()?;
    Some(dir.join("secmanager").join("bookmarks.json"))
}

fn recent_secrets_path() -> Option<PathBuf> {
    let dir = dirs::config_dir()?;
    Some(dir.join("secmanager").join("recent_secrets.json"))
}

#[tauri::command]
pub fn load_bookmarks() -> Option<Vec<String>> {
    let path = bookmarks_path()?;
    let data = fs::read_to_string(path).ok()?;
    serde_json::from_str::<Vec<String>>(&data).ok()
}

#[tauri::command]
pub fn save_bookmarks(bookmarks: Vec<String>) -> bool {
    if let Some(path) = bookmarks_path() {
        let _ = fs::create_dir_all(path.parent().unwrap());
        return fs::write(
            path,
            serde_json::to_vec_pretty(&bookmarks).unwrap_or_default(),
        )
        .is_ok();
    }
    false
}

#[tauri::command]
pub fn load_recent_secrets() -> Option<Vec<String>> {
    let path = recent_secrets_path()?;
    let data = fs::read_to_string(path).ok()?;
    serde_json::from_str::<Vec<String>>(&data).ok()
}

#[tauri::command]
pub fn save_recent_secrets(recent: Vec<String>) -> bool {
    if let Some(path) = recent_secrets_path() {
        let _ = fs::create_dir_all(path.parent().unwrap());
        return fs::write(path, serde_json::to_vec_pretty(&recent).unwrap_or_default()).is_ok();
    }
    false
}
