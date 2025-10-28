#![cfg_attr(all(windows, not(debug_assertions)), windows_subsystem = "windows")]

mod app;
mod config;
mod error;
mod secrets;
mod ui;

use anyhow::{Result, anyhow};
use app::SecManagerApp;

#[tokio::main]
async fn main() -> Result<()> {
    let app = SecManagerApp::new().await?;
    let native_options = eframe::NativeOptions::default();
    eframe::run_native(
        "SecManager",
        native_options,
        Box::new(|_| {
            Ok::<Box<dyn eframe::App>, Box<(dyn std::error::Error + Send + Sync + 'static)>>(
                Box::new(app),
            )
        }),
    )
    .map_err(|e| anyhow!("eframe error: {}", e))
}
