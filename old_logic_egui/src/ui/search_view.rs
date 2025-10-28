use crate::app::SecManagerApp;
use crate::secrets::{fetch_secret, find_match_range};
use std::sync::mpsc;

pub fn render_search_results(app: &mut SecManagerApp, ui: &mut egui::Ui) {
    if app.filtered_secrets.is_empty() {
        ui.label(format!("🔍 No results for \"{}\"", app.search_query));
        return;
    }

    ui.horizontal(|ui| {
        ui.label(format!("📄 {} result(s)", app.filtered_secrets.len()));
        if ui.small_button("Select All").clicked() {
            // Future: implement select all functionality
        }
    });

    ui.separator();

    let filtered_secrets = app.filtered_secrets.clone();
    let search_query = app.search_query.clone();

    egui::ScrollArea::vertical().show(ui, |ui| {
        for secret_name in &filtered_secrets {
            render_search_result_item(ui, secret_name, &search_query, app);
        }
    });
}

pub fn render_search_result_item(
    ui: &mut egui::Ui,
    secret_name: &str,
    query: &str,
    app: &mut SecManagerApp,
) {
    ui.horizontal(|ui| {
        ui.label("📄");

        // Highlight matching parts
        if let Some((match_start, match_end)) = find_match_range(secret_name, query) {
            // Before match
            if match_start > 0 {
                ui.label(&secret_name[..match_start]);
            }

            // Highlighted match
            ui.label(
                egui::RichText::new(&secret_name[match_start..match_end])
                    .background_color(egui::Color32::YELLOW)
                    .color(egui::Color32::BLACK),
            );

            // After match
            if match_end < secret_name.len() {
                ui.label(&secret_name[match_end..]);
            }
        } else {
            ui.label(secret_name);
        }

        // Action buttons
        ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
            if ui.small_button("📖 Get").clicked() {
                fetch_secret_by_name(app, secret_name);
            }
        });
    });
    ui.separator();
}

fn fetch_secret_by_name(app: &mut SecManagerApp, secret_name: &str) {
    app.secret_id_input = secret_name.to_string();
    app.status = format!("Fetching secret: {secret_name}");
    app.push_log(format!("Fetching secret: {secret_name}"));

    let secret_id = secret_name.to_string();
    let profile = app.selected_profile.clone().or(app.default_profile.clone());
    let (tx, rx) = mpsc::channel();
    app.secret_result_rx = Some(rx);
    app.is_editing = false;
    app.is_creating_new = false;

    tokio::spawn(async move {
        let res = fetch_secret(profile.as_deref(), &secret_id).await;
        let _ = tx.send(res);
    });
}
