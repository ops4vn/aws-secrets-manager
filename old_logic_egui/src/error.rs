use aws_sdk_secretsmanager::operation::create_secret::CreateSecretError;
use aws_sdk_secretsmanager::operation::get_secret_value::GetSecretValueError;
use aws_sdk_secretsmanager::operation::update_secret::UpdateSecretError;
use aws_smithy_runtime_api::client::{orchestrator::HttpResponse, result::SdkError};
use aws_smithy_types::error::metadata::ProvideErrorMetadata;

pub fn format_get_error(
    e: &SdkError<GetSecretValueError, HttpResponse>,
    secret_id: &str,
) -> String {
    match e {
        SdkError::ServiceError(se) => {
            let err = se.err();
            let code = err.code().unwrap_or("");
            match code {
                // AWS SM common codes
                "ResourceNotFoundException" => {
                    format!("Error: Secret '{secret_id}' does not exist")
                }
                "InvalidParameterException" => {
                    "Error: Invalid parameter when getting secret".to_string()
                }
                _ => format!(
                    "Error: {}",
                    err.message().unwrap_or("Unknown service error")
                ),
            }
        }
        SdkError::DispatchFailure(df) => format!("Error: Network/dispatch error: {df:?}"),
        SdkError::TimeoutError(te) => format!("Error: Request timed out: {te:?}"),
        other => format!("Error: SDK error: {other:?}"),
    }
}

pub fn format_create_error(
    e: &SdkError<CreateSecretError, HttpResponse>,
    secret_id: &str,
) -> String {
    match e {
        SdkError::ServiceError(se) => {
            let err = se.err();
            let code = err.code().unwrap_or("");
            match code {
                "ResourceExistsException" => format!(
                    "Error: Secret '{secret_id}' already exists. Use Edit or choose another ID.",
                ),
                "InvalidParameterException" => {
                    "Error: Invalid parameter when creating secret".to_string()
                }
                "LimitExceededException" => {
                    "Error: Secrets Manager resource limit exceeded".to_string()
                }
                _ => format!(
                    "Error: {}",
                    err.message().unwrap_or("Unknown service error")
                ),
            }
        }
        SdkError::DispatchFailure(df) => format!("Error: Network/dispatch error: {df:?}"),
        SdkError::TimeoutError(te) => format!("Error: Request timed out: {te:?}"),
        other => format!("Error: SDK error: {other:?}"),
    }
}

pub fn format_update_error(
    e: &SdkError<UpdateSecretError, HttpResponse>,
    _secret_id: &str,
) -> String {
    match e {
        SdkError::ServiceError(se) => {
            let err = se.err();
            let code = err.code().unwrap_or("");
            match code {
                "ResourceNotFoundException" => {
                    "Error: Secret does not exist for update".to_string()
                }
                "InvalidParameterException" => {
                    "Error: Invalid parameter when updating secret".to_string()
                }
                _ => format!(
                    "Error: {}",
                    err.message().unwrap_or("Unknown service error")
                ),
            }
        }
        SdkError::DispatchFailure(df) => format!("Error: Network/dispatch error: {df:?}"),
        SdkError::TimeoutError(te) => format!("Error: Request timed out: {te:?}"),
        other => format!("Error: SDK error: {other:?}"),
    }
}
