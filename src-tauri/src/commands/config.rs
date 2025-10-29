use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

// ==== Types shared to FE ====
#[derive(Serialize, Deserialize)]
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
    let path = cache_path(profile)?;
    let data = fs::read_to_string(path).ok()?;
    serde_json::from_str::<Vec<String>>(&data).ok()
}

#[tauri::command]
pub fn save_cached_secret_names(profile: &str, names: Vec<String>) -> bool {
    if let Some(path) = cache_path(profile) {
        let _ = fs::create_dir_all(path.parent().unwrap());
        return fs::write(path, serde_json::to_vec_pretty(&names).unwrap_or_default()).is_ok();
    }
    false
}
