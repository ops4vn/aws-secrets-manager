mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            // config/cache commands
            commands::config::load_default_profile,
            commands::config::save_default_profile,
            commands::config::load_cached_secret_names,
            commands::config::save_cached_secret_names,
            // profiles and secrets
            commands::aws::load_profiles,
            commands::aws::list_secrets,
            commands::aws::fetch_secret,
            commands::aws::create_secret,
            commands::aws::update_secret,
            commands::aws::check_sso,
            // theme persistence
            commands::config::load_theme,
            commands::config::save_theme,
            commands::aws::trigger_sso_login,
            // window management
            commands::window::show_main_window
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
