use aws_smithy_runtime_api::client::{orchestrator::HttpResponse, result::SdkError};
use aws_smithy_types::error::metadata::ProvideErrorMetadata;
use base64::Engine as _;
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
fn load_default_profile() -> Option<String> {
    let path = config_store_path()?;
    let data = fs::read_to_string(path).ok()?;
    let v: serde_json::Value = serde_json::from_str(&data).ok()?;
    v.get("default_profile")
        .and_then(|s| s.as_str())
        .map(|s| s.to_string())
}

#[tauri::command]
fn save_default_profile(profile: &str) -> bool {
    if let Some(path) = config_store_path() {
        let _ = fs::create_dir_all(path.parent().unwrap());
        let data = serde_json::json!({ "default_profile": profile });
        return fs::write(path, serde_json::to_vec(&data).unwrap_or_default()).is_ok();
    }
    false
}

#[tauri::command]
fn load_theme() -> Option<String> {
    let path = config_store_path()?;
    let data = fs::read_to_string(path).ok()?;
    let v: serde_json::Value = serde_json::from_str(&data).ok()?;
    v.get("theme")
        .and_then(|s| s.as_str())
        .map(|s| s.to_string())
}

#[tauri::command]
fn save_theme(theme: &str) -> bool {
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
fn load_cached_secret_names(profile: &str) -> Option<Vec<String>> {
    let path = cache_path(profile)?;
    let data = fs::read_to_string(path).ok()?;
    serde_json::from_str::<Vec<String>>(&data).ok()
}

#[tauri::command]
fn save_cached_secret_names(profile: &str, names: Vec<String>) -> bool {
    if let Some(path) = cache_path(profile) {
        let _ = fs::create_dir_all(path.parent().unwrap());
        return fs::write(path, serde_json::to_vec_pretty(&names).unwrap_or_default()).is_ok();
    }
    false
}

// ==== AWS Profiles ====
#[tauri::command]
async fn load_profiles() -> Result<Vec<String>, String> {
    // Fallback parser for ~/.aws/config and ~/.aws/credentials
    let mut names: Vec<String> = Vec::new();
    let mut add_profile = |raw: &str| {
        let name = raw.trim().to_string();
        if !name.is_empty() && !names.contains(&name) {
            names.push(name);
        }
    };
    if let Some(home) = dirs::home_dir() {
        let cfg = home.join(".aws").join("config");
        if let Ok(s) = fs::read_to_string(cfg) {
            for line in s.lines() {
                let line = line.trim();
                if line.starts_with('[') && line.ends_with(']') {
                    let mut inner = &line[1..line.len() - 1];
                    inner = inner.strip_prefix("profile ").unwrap_or(inner);
                    add_profile(inner);
                }
            }
        }
        let creds = home.join(".aws").join("credentials");
        if let Ok(s) = fs::read_to_string(creds) {
            for line in s.lines() {
                let line = line.trim();
                if line.starts_with('[') && line.ends_with(']') {
                    let inner = &line[1..line.len() - 1];
                    add_profile(inner);
                }
            }
        }
    }
    if names.is_empty() {
        names.push("default".to_string());
    }
    Ok(names)
}

// ==== AWS Secrets APIs ====
#[tauri::command]
async fn list_secrets(profile: Option<String>) -> Result<Vec<String>, String> {
    let mut loader = aws_config::defaults(aws_config::BehaviorVersion::latest());
    if let Some(p) = profile {
        loader = loader.profile_name(p);
    }
    let config = loader.load().await;
    let client = aws_sdk_secretsmanager::Client::new(&config);

    let mut out = Vec::new();
    let mut next: Option<String> = None;
    loop {
        let mut req = client.list_secrets().max_results(100);
        if let Some(token) = next {
            req = req.next_token(token);
        }
        let resp = req
            .send()
            .await
            .map_err(|e| format!("{}", format_list_error(&e)))?;
        for s in resp.secret_list() {
            if let Some(n) = s.name() {
                out.push(n.to_string());
            }
        }
        next = resp.next_token().map(|s| s.to_string());
        if next.is_none() {
            break;
        }
    }
    Ok(out)
}

#[tauri::command]
async fn fetch_secret(profile: Option<String>, secret_id: String) -> Result<SecretContent, String> {
    let mut loader = aws_config::defaults(aws_config::BehaviorVersion::latest());
    if let Some(p) = profile {
        loader = loader.profile_name(p);
    }
    let config = loader.load().await;
    let client = aws_sdk_secretsmanager::Client::new(&config);
    let resp = client
        .get_secret_value()
        .secret_id(&secret_id)
        .send()
        .await
        .map_err(|e| format!("{}", format_get_error(&e, &secret_id)))?;
    if let Some(s) = resp.secret_string {
        return Ok(SecretContent {
            string: Some(s),
            binary_base64: None,
        });
    }
    if let Some(b) = resp.secret_binary {
        return Ok(SecretContent {
            string: None,
            binary_base64: Some(base64::engine::general_purpose::STANDARD.encode(b.as_ref())),
        });
    }
    Err("Secret has neither string nor binary".to_string())
}

#[tauri::command]
async fn create_secret(
    profile: Option<String>,
    secret_id: String,
    secret_value: String,
    description: Option<String>,
) -> Result<String, String> {
    let mut loader = aws_config::defaults(aws_config::BehaviorVersion::latest());
    if let Some(p) = profile {
        loader = loader.profile_name(p);
    }
    let config = loader.load().await;
    let client = aws_sdk_secretsmanager::Client::new(&config);
    let mut req = client
        .create_secret()
        .name(secret_id.clone())
        .secret_string(secret_value);
    if let Some(desc) = description {
        req = req.description(desc);
    }
    let resp = req
        .send()
        .await
        .map_err(|e| format!("{}", format_create_error(&e, &secret_id)))?;
    Ok(format!(
        "Created secret: {}",
        resp.name().unwrap_or("unknown")
    ))
}

#[tauri::command]
async fn update_secret(
    profile: Option<String>,
    secret_id: String,
    secret_value: String,
    description: Option<String>,
) -> Result<String, String> {
    let mut loader = aws_config::defaults(aws_config::BehaviorVersion::latest());
    if let Some(p) = profile {
        loader = loader.profile_name(p);
    }
    let config = loader.load().await;
    let client = aws_sdk_secretsmanager::Client::new(&config);
    let mut req = client
        .update_secret()
        .secret_id(secret_id)
        .secret_string(secret_value);
    if let Some(desc) = description {
        req = req.description(desc);
    }
    let resp = req
        .send()
        .await
        .map_err(|e| format!("{}", format_update_error(&e)))?;
    Ok(format!(
        "Updated secret: {}",
        resp.name().unwrap_or("unknown")
    ))
}

// ===== Friendly error formatters (user-facing) =====
fn format_get_error(
    e: &SdkError<
        aws_sdk_secretsmanager::operation::get_secret_value::GetSecretValueError,
        HttpResponse,
    >,
    secret_id: &str,
) -> String {
    match e {
        SdkError::ServiceError(se) => {
            let err = se.err();
            let code = err.code().unwrap_or("");
            match code {
                "ResourceNotFoundException" => format!("Secret '{secret_id}' does not exist"),
                "InvalidParameterException" => "Invalid parameter when getting secret".to_string(),
                _ => format!(
                    "{code}: {}",
                    err.message().unwrap_or("Unknown service error")
                ),
            }
        }
        SdkError::DispatchFailure(df) => format!("Network/dispatch error: {df:?}"),
        SdkError::TimeoutError(te) => format!("Request timed out: {te:?}"),
        other => format!("SDK error: {other:?}"),
    }
}

fn format_create_error(
    e: &SdkError<aws_sdk_secretsmanager::operation::create_secret::CreateSecretError, HttpResponse>,
    secret_id: &str,
) -> String {
    match e {
        SdkError::ServiceError(se) => {
            let err = se.err();
            let code = err.code().unwrap_or("");
            match code {
                "ResourceExistsException" => {
                    format!("Secret '{secret_id}' already exists. Use Edit or choose another ID.")
                }
                "InvalidParameterException" => "Invalid parameter when creating secret".to_string(),
                "LimitExceededException" => "Secrets Manager resource limit exceeded".to_string(),
                _ => format!(
                    "{code}: {}",
                    err.message().unwrap_or("Unknown service error")
                ),
            }
        }
        SdkError::DispatchFailure(df) => format!("Network/dispatch error: {df:?}"),
        SdkError::TimeoutError(te) => format!("Request timed out: {te:?}"),
        other => format!("SDK error: {other:?}"),
    }
}

fn format_update_error(
    e: &SdkError<aws_sdk_secretsmanager::operation::update_secret::UpdateSecretError, HttpResponse>,
) -> String {
    match e {
        SdkError::ServiceError(se) => {
            let err = se.err();
            let code = err.code().unwrap_or("");
            match code {
                "ResourceNotFoundException" => "Secret does not exist for update".to_string(),
                "InvalidParameterException" => "Invalid parameter when updating secret".to_string(),
                _ => format!(
                    "{code}: {}",
                    err.message().unwrap_or("Unknown service error")
                ),
            }
        }
        SdkError::DispatchFailure(df) => format!("Network/dispatch error: {df:?}"),
        SdkError::TimeoutError(te) => format!("Request timed out: {te:?}"),
        other => format!("SDK error: {other:?}"),
    }
}

fn format_list_error(
    e: &SdkError<aws_sdk_secretsmanager::operation::list_secrets::ListSecretsError, HttpResponse>,
) -> String {
    match e {
        SdkError::ServiceError(se) => {
            let err = se.err();
            let code = err.code().unwrap_or("");
            format!(
                "{code}: {}",
                err.message().unwrap_or("Unknown service error")
            )
        }
        SdkError::DispatchFailure(df) => format!("Network/dispatch error: {df:?}"),
        SdkError::TimeoutError(te) => format!("Request timed out: {te:?}"),
        other => format!("SDK error: {other:?}"),
    }
}

#[tauri::command]
async fn check_sso(profile: String) -> Result<bool, String> {
    let loader = aws_config::defaults(aws_config::BehaviorVersion::latest()).profile_name(profile);
    let config = loader.load().await;
    let sts = aws_sdk_sts::Client::new(&config);
    Ok(sts.get_caller_identity().send().await.is_ok())
}

#[tauri::command]
async fn trigger_sso_login(profile: String) -> Result<bool, String> {
    std::process::Command::new("aws")
        .args(["sso", "login", "--profile", &profile])
        .spawn()
        .map_err(|e| format!("spawn error: {e}"))?;
    Ok(true)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            // config/cache commands
            load_default_profile,
            save_default_profile,
            load_cached_secret_names,
            save_cached_secret_names,
            // profiles and secrets
            load_profiles,
            list_secrets,
            fetch_secret,
            create_secret,
            update_secret,
            check_sso,
            // theme persistence
            load_theme,
            save_theme,
            trigger_sso_login,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
