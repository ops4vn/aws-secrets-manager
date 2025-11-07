use crate::commands::config::{SecretContent, SecretMetadata};
use crate::helper::aws_helper;
use aws_smithy_runtime_api::client::{orchestrator::HttpResponse, result::SdkError};
use aws_smithy_types::error::metadata::ProvideErrorMetadata;
use base64::Engine as _;
use serde::Serialize;
use tauri::Emitter;

// ==== AWS Profiles ====
#[tauri::command]
pub async fn load_profiles() -> Result<Vec<String>, String> {
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
        if let Ok(s) = std::fs::read_to_string(cfg) {
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
        if let Ok(s) = std::fs::read_to_string(creds) {
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
pub async fn list_secrets(profile: Option<String>) -> Result<Vec<String>, String> {
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
        let resp = req.send().await.map_err(|e| format_list_error(&e))?;
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
pub async fn list_secrets_with_metadata(
    profile: Option<String>,
) -> Result<Vec<SecretMetadata>, String> {
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
        let resp = req.send().await.map_err(|e| format_list_error(&e))?;
        for s in resp.secret_list() {
            if let Some(n) = s.name() {
                // Check if secret has binary by looking at primary_region_secret_string_binary
                // or we can detect from secret_binary field if available in list response
                // Note: AWS list_secrets doesn't provide secret_binary directly, so we'll mark as false by default
                // and update when we fetch the actual secret
                out.push(SecretMetadata {
                    name: n.to_string(),
                    is_binary: false, // Default, will be updated when fetched
                });
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
pub async fn fetch_secret(
    profile: Option<String>,
    secret_id: String,
) -> Result<SecretContent, String> {
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
        .map_err(|e| format_get_error(&e, &secret_id))?;
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

#[derive(Serialize, Clone)]
struct SecretFetchResult {
    secret_id: String,
    content: SecretContent,
}

#[derive(Serialize, Clone)]
struct SecretFetchError {
    secret_id: String,
    error: String,
}

#[tauri::command]
pub async fn fetch_secret_async(
    app: tauri::AppHandle,
    profile: Option<String>,
    secret_id: String,
) -> Result<bool, String> {
    let profile_clone = profile.clone();
    let secret_id_clone = secret_id.clone();

    tauri::async_runtime::spawn(async move {
        let mut loader = aws_config::defaults(aws_config::BehaviorVersion::latest());
        if let Some(p) = profile_clone {
            loader = loader.profile_name(p);
        }
        let config = loader.load().await;
        let client = aws_sdk_secretsmanager::Client::new(&config);

        match client
            .get_secret_value()
            .secret_id(&secret_id_clone)
            .send()
            .await
        {
            Ok(resp) => {
                let content = if let Some(s) = resp.secret_string {
                    SecretContent {
                        string: Some(s),
                        binary_base64: None,
                    }
                } else if let Some(b) = resp.secret_binary {
                    SecretContent {
                        string: None,
                        binary_base64: Some(
                            base64::engine::general_purpose::STANDARD.encode(b.as_ref()),
                        ),
                    }
                } else {
                    let _ = app.emit(
                        "secret_fetch_error",
                        SecretFetchError {
                            secret_id: secret_id_clone,
                            error: "Secret has neither string nor binary".to_string(),
                        },
                    );
                    return;
                };

                let _ = app.emit(
                    "secret_fetch_ok",
                    SecretFetchResult {
                        secret_id: secret_id_clone,
                        content,
                    },
                );
            }
            Err(e) => {
                let error_msg = format_get_error(&e, &secret_id_clone);
                let _ = app.emit(
                    "secret_fetch_error",
                    SecretFetchError {
                        secret_id: secret_id_clone.clone(),
                        error: error_msg,
                    },
                );
            }
        }
    });

    Ok(true)
}

#[tauri::command]
pub async fn create_secret(
    profile: Option<String>,
    secret_id: String,
    secret_value: String,
    description: Option<String>,
    is_binary: Option<bool>,
) -> Result<String, String> {
    let mut loader = aws_config::defaults(aws_config::BehaviorVersion::latest());
    if let Some(p) = profile {
        loader = loader.profile_name(p);
    }
    let config = loader.load().await;
    let client = aws_sdk_secretsmanager::Client::new(&config);
    let mut req = client.create_secret().name(secret_id.clone());

    // If is_binary is true, decode base64 and use secret_binary
    if is_binary == Some(true) {
        let binary_data = base64::engine::general_purpose::STANDARD
            .decode(&secret_value)
            .map_err(|e| format!("Failed to decode base64: {e}"))?;
        req = req.secret_binary(binary_data.into());
    } else {
        req = req.secret_string(secret_value);
    }

    if let Some(desc) = description {
        req = req.description(desc);
    }
    let resp = req
        .send()
        .await
        .map_err(|e| format_create_error(&e, &secret_id))?;
    Ok(format!(
        "Created secret: {}",
        resp.name().unwrap_or("unknown")
    ))
}

#[tauri::command]
pub async fn update_secret(
    profile: Option<String>,
    secret_id: String,
    secret_value: String,
    description: Option<String>,
    is_binary: Option<bool>,
) -> Result<String, String> {
    let mut loader = aws_config::defaults(aws_config::BehaviorVersion::latest());
    if let Some(p) = profile {
        loader = loader.profile_name(p);
    }
    let config = loader.load().await;
    let client = aws_sdk_secretsmanager::Client::new(&config);
    let mut req = client.update_secret().secret_id(secret_id.clone());

    // If is_binary is true, decode base64 and use secret_binary
    if is_binary == Some(true) {
        let binary_data = base64::engine::general_purpose::STANDARD
            .decode(&secret_value)
            .map_err(|e| format!("Failed to decode base64: {e}"))?;
        req = req.secret_binary(binary_data.into());
    } else {
        req = req.secret_string(secret_value);
    }

    if let Some(desc) = description {
        req = req.description(desc);
    }
    let resp = req.send().await.map_err(|e| format_update_error(&e))?;
    Ok(format!(
        "Updated secret: {}",
        resp.name().unwrap_or("unknown")
    ))
}

#[tauri::command]
pub async fn delete_secret(profile: Option<String>, secret_id: String) -> Result<String, String> {
    let mut loader = aws_config::defaults(aws_config::BehaviorVersion::latest());
    if let Some(p) = profile {
        loader = loader.profile_name(p);
    }
    let config = loader.load().await;
    let client = aws_sdk_secretsmanager::Client::new(&config);
    let resp = client
        .delete_secret()
        .secret_id(&secret_id)
        .send()
        .await
        .map_err(|e| format_delete_error(&e, &secret_id))?;
    Ok(format!(
        "Deleted secret: {}",
        resp.name().unwrap_or("unknown")
    ))
}

#[tauri::command]
pub async fn check_sso(profile: String) -> Result<bool, String> {
    let loader = aws_config::defaults(aws_config::BehaviorVersion::latest()).profile_name(profile);
    let config = loader.load().await;
    let sts = aws_sdk_sts::Client::new(&config);
    match sts.get_caller_identity().send().await {
        Ok(_) => Ok(true),
        Err(e) => {
            // Trả về lỗi để phía UI có thể hiển thị thay vì chỉ trả false
            let msg = match e {
                SdkError::ServiceError(se) => {
                    let code = se.err().code().unwrap_or("");
                    let message = se.err().message().unwrap_or("Unknown service error");
                    format!("{code}: {message}")
                }
                SdkError::DispatchFailure(df) => format!("Network/dispatch error: {df:?}"),
                SdkError::TimeoutError(te) => format!("Request timed out: {te:?}"),
                other => format!("SDK error: {other:?}"),
            };
            Err(format!("SSO invalid or expired: {msg}"))
        }
    }
}

#[tauri::command]
pub async fn trigger_sso_login(app: tauri::AppHandle, profile: String) -> Result<bool, String> {
    let aws_cli_path =
        aws_helper::find_aws_cli_path().map_err(|e| format!("Error finding aws cli: {e}"))?;
    std::process::Command::new(aws_cli_path)
        .args(["sso", "login", "--profile", &profile])
        .spawn()
        .map_err(|e| format!("spawn error: {e}"))?;

    // Poll STS until SSO is valid, then emit an event to frontend
    let app_handle = app.clone();
    let profile_clone = profile.clone();
    tauri::async_runtime::spawn(async move {
        let loader = aws_config::defaults(aws_config::BehaviorVersion::latest())
            .profile_name(profile_clone.clone());
        let config = loader.load().await;
        let sts = aws_sdk_sts::Client::new(&config);
        let mut success = false;
        for _ in 0..60 {
            if sts.get_caller_identity().send().await.is_ok() {
                success = true;
                break;
            }
            tokio::time::sleep(std::time::Duration::from_secs(2)).await;
        }
        if success {
            let _ = app_handle.emit("sso_login_ok", profile_clone);
        } else {
            let _ = app_handle.emit("sso_login_timeout", "timeout");
        }
    });

    Ok(true)
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

fn format_delete_error(
    e: &SdkError<aws_sdk_secretsmanager::operation::delete_secret::DeleteSecretError, HttpResponse>,
    secret_id: &str,
) -> String {
    match e {
        SdkError::ServiceError(se) => {
            let err = se.err();
            let code = err.code().unwrap_or("");
            match code {
                "ResourceNotFoundException" => format!("Secret '{secret_id}' does not exist"),
                "InvalidParameterException" => "Invalid parameter when deleting secret".to_string(),
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
