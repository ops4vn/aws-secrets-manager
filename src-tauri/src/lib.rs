mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // ===== Custom App Menu (About / Support / Contact) =====
    let app_name = "Secrets Manager";

    tauri::Builder::default()
        .setup(move |app| {
            use tauri::menu::{Menu, MenuItem, Submenu};
            let about = MenuItem::with_id(
                app,
                "about_app",
                format!("About {}", app_name),
                true,
                None::<&str>,
            )?;
            let support = MenuItem::with_id(app, "support", "Support", true, None::<&str>)?;
            let contact = MenuItem::with_id(app, "contact", "Contact", true, None::<&str>)?;

            let submenu = Submenu::new(app, app_name, true)?;
            submenu.append(&about)?;
            submenu.append(&support)?;
            submenu.append(&contact)?;

            let menu = Menu::new(app)?;
            menu.append(&submenu)?;
            app.set_menu(menu)?;
            Ok(())
        })
        .on_menu_event(|_, event| {
            match event.id().as_ref() {
                "about_app" => {
                    let version = env!("CARGO_PKG_VERSION");
                    let author = "Le Dang Dung";
                    let text = format!(
                        "{} v{}\nAuthor: {}\nSupport: https://fb.com/ledungcodedao\nContact: ledung.itsme@gmail.com",
                        "Secrets Manager", version, author
                    );
                    #[cfg(target_os = "macos")]
                    {
                        let _ = std::process::Command::new("osascript")
                            .args([
                                "-e",
                                &format!(
                                    "display dialog \"{}\" with title \"About Secrets Manager\" buttons {{\"OK\"}} default button 1",
                                    text.replace('"', "\\\"")
                                ),
                            ])
                            .spawn();
                    }
                }
                "support" => {
                    let url = "https://fb.com/ledungcodedao";
                    #[cfg(target_os = "macos")]
                    {
                        let _ = std::process::Command::new("open").arg(url).spawn();
                    }
                    #[cfg(target_os = "linux")]
                    {
                        let _ = std::process::Command::new("xdg-open").arg(url).spawn();
                    }
                    #[cfg(target_os = "windows")]
                    {
                        let _ = std::process::Command::new("cmd").args(["/C", "start", url]).spawn();
                    }
                }
                "contact" => {
                    let url = "mailto:ledung.itsme@gmail.com";
                    #[cfg(target_os = "macos")]
                    {
                        let _ = std::process::Command::new("open").arg(url).spawn();
                    }
                    #[cfg(target_os = "linux")]
                    {
                        let _ = std::process::Command::new("xdg-open").arg(url).spawn();
                    }
                    #[cfg(target_os = "windows")]
                    {
                        let _ = std::process::Command::new("cmd").args(["/C", "start", url]).spawn();
                    }
                }
                _ => {}
            }
        })
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            // config/cache commands
            commands::config::load_default_profile,
            commands::config::save_default_profile,
            commands::config::load_cached_secret_names,
            commands::config::save_cached_secret_names,
            commands::config::load_bookmarks,
            commands::config::save_bookmarks,
            commands::config::load_recent_secrets,
            commands::config::save_recent_secrets,
            // profiles and secrets
            commands::aws::load_profiles,
            commands::aws::list_secrets,
            commands::aws::list_secrets_with_metadata,
            commands::aws::fetch_secret,
            commands::aws::fetch_secret_async,
            commands::aws::create_secret,
            commands::aws::update_secret,
            commands::aws::check_sso,
            // cache metadata
            commands::config::load_cached_secret_metadata,
            commands::config::save_cached_secret_metadata,
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
