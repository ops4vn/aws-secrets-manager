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
    // Không force delete, giữ recovery window mặc định (30 ngày)
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
pub async fn list_deleted_secrets(profile: Option<String>) -> Result<Vec<String>, String> {
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
            // Chỉ lấy các secret đã bị xóa (có deletion_date)
            if s.deleted_date().is_some() {
                if let Some(n) = s.name() {
                    out.push(n.to_string());
                }
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
pub async fn restore_secret(profile: Option<String>, secret_id: String) -> Result<String, String> {
    let mut loader = aws_config::defaults(aws_config::BehaviorVersion::latest());
    if let Some(p) = profile {
        loader = loader.profile_name(p);
    }
    let config = loader.load().await;
    let client = aws_sdk_secretsmanager::Client::new(&config);
    let resp = client
        .restore_secret()
        .secret_id(&secret_id)
        .send()
        .await
        .map_err(|e| format_restore_error(&e, &secret_id))?;
    Ok(format!(
        "Restored secret: {}",
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

// ==== Describe / Tags / Versions ====

#[derive(Serialize, Clone, serde::Deserialize)]
pub struct SecretTag {
    pub key: String,
    pub value: String,
}

#[derive(Serialize, Clone)]
pub struct SecretDescription {
    pub arn: Option<String>,
    pub name: Option<String>,
    pub description: Option<String>,
    // Dates as epoch seconds; the frontend multiplies by 1000 for Date().
    pub created_date: Option<i64>,
    pub last_changed_date: Option<i64>,
    pub last_accessed_date: Option<i64>,
    pub last_rotated_date: Option<i64>,
    pub next_rotation_date: Option<i64>,
    pub deleted_date: Option<i64>,
    pub rotation_enabled: Option<bool>,
    pub rotation_lambda_arn: Option<String>,
    pub rotation_automatically_after_days: Option<i64>,
    pub primary_region: Option<String>,
    pub tags: Vec<SecretTag>,
}

#[derive(Serialize, Clone)]
pub struct SecretVersion {
    pub version_id: String,
    pub version_stages: Vec<String>,
    pub created_date: Option<i64>,
    pub last_accessed_date: Option<i64>,
}

async fn sm_client(profile: Option<String>) -> aws_sdk_secretsmanager::Client {
    let mut loader = aws_config::defaults(aws_config::BehaviorVersion::latest());
    if let Some(p) = profile {
        loader = loader.profile_name(p);
    }
    let config = loader.load().await;
    aws_sdk_secretsmanager::Client::new(&config)
}

#[tauri::command]
pub async fn describe_secret(
    profile: Option<String>,
    secret_id: String,
) -> Result<SecretDescription, String> {
    let client = sm_client(profile).await;
    let resp = client
        .describe_secret()
        .secret_id(&secret_id)
        .send()
        .await
        .map_err(|e| format_sdk_err(&e))?;

    let tags = resp
        .tags()
        .iter()
        .map(|t| SecretTag {
            key: t.key().unwrap_or("").to_string(),
            value: t.value().unwrap_or("").to_string(),
        })
        .collect();

    Ok(SecretDescription {
        arn: resp.arn().map(|s| s.to_string()),
        name: resp.name().map(|s| s.to_string()),
        description: resp.description().map(|s| s.to_string()),
        created_date: resp.created_date().map(|d| d.secs()),
        last_changed_date: resp.last_changed_date().map(|d| d.secs()),
        last_accessed_date: resp.last_accessed_date().map(|d| d.secs()),
        last_rotated_date: resp.last_rotated_date().map(|d| d.secs()),
        next_rotation_date: resp.next_rotation_date().map(|d| d.secs()),
        deleted_date: resp.deleted_date().map(|d| d.secs()),
        rotation_enabled: resp.rotation_enabled(),
        rotation_lambda_arn: resp.rotation_lambda_arn().map(|s| s.to_string()),
        rotation_automatically_after_days: resp
            .rotation_rules()
            .and_then(|r| r.automatically_after_days()),
        primary_region: resp.primary_region().map(|s| s.to_string()),
        tags,
    })
}

#[tauri::command]
pub async fn tag_secret(
    profile: Option<String>,
    secret_id: String,
    tags: Vec<SecretTag>,
) -> Result<String, String> {
    let client = sm_client(profile).await;
    let sdk_tags: Vec<aws_sdk_secretsmanager::types::Tag> = tags
        .into_iter()
        .map(|t| {
            aws_sdk_secretsmanager::types::Tag::builder()
                .key(t.key)
                .value(t.value)
                .build()
        })
        .collect();
    client
        .tag_resource()
        .secret_id(&secret_id)
        .set_tags(Some(sdk_tags))
        .send()
        .await
        .map_err(|e| format_sdk_err(&e))?;
    Ok(format!("Tagged secret: {secret_id}"))
}

#[tauri::command]
pub async fn untag_secret(
    profile: Option<String>,
    secret_id: String,
    keys: Vec<String>,
) -> Result<String, String> {
    let client = sm_client(profile).await;
    client
        .untag_resource()
        .secret_id(&secret_id)
        .set_tag_keys(Some(keys))
        .send()
        .await
        .map_err(|e| format_sdk_err(&e))?;
    Ok(format!("Untagged secret: {secret_id}"))
}

#[tauri::command]
pub async fn list_secret_versions(
    profile: Option<String>,
    secret_id: String,
) -> Result<Vec<SecretVersion>, String> {
    let client = sm_client(profile).await;
    let mut out = Vec::new();
    let mut next: Option<String> = None;
    loop {
        let mut req = client
            .list_secret_version_ids()
            .secret_id(&secret_id)
            .include_deprecated(true)
            .max_results(100);
        if let Some(token) = next {
            req = req.next_token(token);
        }
        let resp = req.send().await.map_err(|e| format_sdk_err(&e))?;
        for v in resp.versions() {
            if let Some(vid) = v.version_id() {
                out.push(SecretVersion {
                    version_id: vid.to_string(),
                    version_stages: v.version_stages().iter().map(|s| s.to_string()).collect(),
                    created_date: v.created_date().map(|d| d.secs()),
                    last_accessed_date: v.last_accessed_date().map(|d| d.secs()),
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
pub async fn fetch_secret_version(
    profile: Option<String>,
    secret_id: String,
    version_id: String,
) -> Result<SecretContent, String> {
    let client = sm_client(profile).await;
    let resp = client
        .get_secret_value()
        .secret_id(&secret_id)
        .version_id(&version_id)
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

fn format_sdk_err<E>(e: &SdkError<E, HttpResponse>) -> String
where
    E: ProvideErrorMetadata + std::fmt::Debug,
{
    match e {
        SdkError::ServiceError(se) => {
            let err = se.err();
            let code = err.code().unwrap_or("");
            let message = err.message().unwrap_or("Unknown service error");
            format!("{code}: {message}")
        }
        SdkError::DispatchFailure(df) => format!("Network/dispatch error: {df:?}"),
        SdkError::TimeoutError(te) => format!("Request timed out: {te:?}"),
        other => format!("SDK error: {other:?}"),
    }
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

fn format_restore_error(
    e: &SdkError<
        aws_sdk_secretsmanager::operation::restore_secret::RestoreSecretError,
        HttpResponse,
    >,
    secret_id: &str,
) -> String {
    match e {
        SdkError::ServiceError(se) => {
            let err = se.err();
            let code = err.code().unwrap_or("");
            match code {
                "ResourceNotFoundException" => {
                    format!("Secret '{secret_id}' does not exist or is not in deleted state")
                }
                "InvalidParameterException" => {
                    "Invalid parameter when restoring secret".to_string()
                }
                "InvalidRequestException" => format!(
                    "Secret '{secret_id}' cannot be restored (recovery window may have expired)"
                ),
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
