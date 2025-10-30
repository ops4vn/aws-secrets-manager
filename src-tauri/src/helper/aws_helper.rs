use std::path::PathBuf;

pub fn find_aws_cli_path() -> Result<PathBuf, String> {
    #[cfg(target_os = "windows")]
    let candidates = [
        "aws.exe",
        "C:/Program Files/Amazon/AWSCLIV2/aws.exe",
        "C:/Program Files (x86)/Amazon/AWSCLIV2/aws.exe",
    ];
    #[cfg(target_os = "macos")]
    let candidates = [
        "aws",
        "/usr/local/bin/aws",
        "/opt/homebrew/bin/aws",
        "/usr/bin/aws",
    ];
    #[cfg(target_os = "linux")]
    let candidates = ["aws", "/usr/local/bin/aws", "/usr/bin/aws"];

    // Prefer to use which command to check in $PATH system
    for c in candidates.iter() {
        if let Ok(path) = which::which(c) {
            return Ok(path);
        }
        if PathBuf::from(c).exists() {
            return Ok(PathBuf::from(c));
        }
    }
    Err("Not found aws cli".to_string())
}
