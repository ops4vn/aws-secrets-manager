use anyhow::{Result, anyhow};
use aws_sdk_secretsmanager::Client as SecretsClient;
use aws_sdk_sts::Client as StsClient;

use crate::error::{format_create_error, format_get_error, format_update_error};

pub async fn fetch_secret(
    profile: Option<&str>,
    secret_id: &str,
) -> Result<(Option<String>, Option<Vec<u8>>)> {
    let mut loader = aws_config::defaults(aws_config::BehaviorVersion::latest());
    if let Some(p) = profile {
        loader = loader.profile_name(p);
    }
    let config = loader.load().await;
    let client = SecretsClient::new(&config);
    let resp = match client.get_secret_value().secret_id(secret_id).send().await {
        Ok(ok) => ok,
        Err(e) => {
            let friendly = format_get_error(&e, secret_id);
            return Err(anyhow!(friendly));
        }
    };
    if let Some(s) = resp.secret_string {
        return Ok((Some(s), None));
    }
    if let Some(b) = resp.secret_binary {
        return Ok((None, Some(b.into_inner().to_vec())));
    }
    Err(anyhow!("Secret has neither string nor binary"))
}

pub async fn create_secret(
    profile: Option<&str>,
    secret_id: &str,
    secret_value: &str,
    description: Option<&str>,
) -> Result<String> {
    let mut loader = aws_config::defaults(aws_config::BehaviorVersion::latest());
    if let Some(p) = profile {
        loader = loader.profile_name(p);
    }
    let config = loader.load().await;
    let client = SecretsClient::new(&config);

    let mut req = client
        .create_secret()
        .name(secret_id)
        .secret_string(secret_value);
    if let Some(desc) = description {
        req = req.description(desc);
    }

    let resp = match req.send().await {
        Ok(ok) => ok,
        Err(e) => {
            let friendly = format_create_error(&e, secret_id);
            return Err(anyhow!(friendly));
        }
    };
    Ok(format!(
        "Created secret: {}",
        resp.name().unwrap_or("unknown")
    ))
}

pub async fn update_secret(
    profile: Option<&str>,
    secret_id: &str,
    secret_value: &str,
    description: Option<&str>,
) -> Result<String> {
    let mut loader = aws_config::defaults(aws_config::BehaviorVersion::latest());
    if let Some(p) = profile {
        loader = loader.profile_name(p);
    }
    let config = loader.load().await;
    let client = SecretsClient::new(&config);

    let mut req = client
        .update_secret()
        .secret_id(secret_id)
        .secret_string(secret_value);
    if let Some(desc) = description {
        req = req.description(desc);
    }

    let resp = match req.send().await {
        Ok(ok) => ok,
        Err(e) => {
            let friendly = format_update_error(&e, secret_id);
            return Err(anyhow!(friendly));
        }
    };
    Ok(format!(
        "Updated secret: {}",
        resp.name().unwrap_or("unknown")
    ))
}

pub async fn list_secrets(profile: Option<&str>) -> Result<Vec<String>> {
    let mut loader = aws_config::defaults(aws_config::BehaviorVersion::latest());
    if let Some(p) = profile {
        loader = loader.profile_name(p);
    }
    let config = loader.load().await;
    let client = SecretsClient::new(&config);

    let mut secrets = Vec::new();
    let mut next_token: Option<String> = None;

    loop {
        let mut request = client.list_secrets().max_results(100);
        if let Some(token) = next_token {
            request = request.next_token(token);
        }

        match request.send().await {
            Ok(response) => {
                for secret in response.secret_list() {
                    if let Some(name) = secret.name() {
                        secrets.push(name.to_string());
                    }
                }

                next_token = response.next_token().map(|s| s.to_string());
                if next_token.is_none() {
                    break;
                }
            }
            Err(e) => {
                let friendly = format!("Error listing secrets: {e}");
                return Err(anyhow!(friendly));
            }
        }
    }

    Ok(secrets)
}

pub async fn check_sts(profile: &str) -> bool {
    let loader = aws_config::defaults(aws_config::BehaviorVersion::latest())
        .profile_name(profile.to_string());
    let config = loader.load().await;
    let sts = StsClient::new(&config);
    sts.get_caller_identity().send().await.is_ok()
}
