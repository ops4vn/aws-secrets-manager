use anyhow::Result;
use base64::Engine as _;
use base64::engine::general_purpose::STANDARD as BASE64;
use eframe::{App, egui};
use egui::{Align, Layout};
use serde_json::Value as JsonValue;
use std::sync::mpsc::{self, Receiver};

use crate::config::Config;
use crate::secrets::{
    SecretNode, build_tree, check_sts, create_secret, fetch_secret, filter_secrets, list_secrets,
    update_secret,
};
use crate::ui::{render_search_results, render_tree_view};

// Type alias for complex receiver type
type SecretResultReceiver =
    Option<Receiver<Result<(Option<String>, Option<Vec<u8>>), anyhow::Error>>>;

pub struct SecManagerApp {
    pub profiles: Vec<String>,
    pub selected_profile: Option<String>,
    pub default_profile: Option<String>,
    pub secret_id_input: String,
    pub editor_content: String,
    pub editor_is_binary: bool,
    pub is_editing: bool,
    pub is_creating_new: bool,
    pub secret_description: String,
    pub status: String,
    pub secret_result_rx: SecretResultReceiver,
    pub save_result_rx: Option<Receiver<Result<String, anyhow::Error>>>,
    pub status_rx: Option<Receiver<String>>,
    pub logs: Vec<String>,
    // Tree view for secrets
    pub secrets_tree: SecretNode,
    pub list_secrets_rx: Option<Receiver<Result<Vec<String>, anyhow::Error>>>,
    pub show_secrets_tree: bool,
    // Search functionality
    pub search_query: String,
    pub all_secret_names: Vec<String>,
    pub filtered_secrets: Vec<String>,
}

impl SecManagerApp {
    pub async fn new() -> Result<Self> {
        let profiles = Config::load_profiles().await.unwrap_or_default();
        let default_profile = Config::load_default_profile();
        let selected_profile = default_profile.clone();

        let mut app = Self {
            profiles,
            selected_profile,
            default_profile,
            secret_id_input: String::new(),
            editor_content: String::new(),
            editor_is_binary: false,
            is_editing: false,
            is_creating_new: false,
            secret_description: String::new(),
            status: String::new(),
            secret_result_rx: None,
            save_result_rx: None,
            status_rx: None,
            logs: Vec::new(),
            secrets_tree: SecretNode::new("root".to_string(), "".to_string(), false),
            list_secrets_rx: None,
            show_secrets_tree: false,
            search_query: String::new(),
            all_secret_names: Vec::new(),
            filtered_secrets: Vec::new(),
        };

        // Load cached secrets for default profile on startup
        if let Some(p) = app.default_profile.clone() {
            if let Some(names) = Config::load_cached_secret_names(&p) {
                app.build_secrets_tree(&names);
                app.status = format!("Loaded {} cached secrets", names.len());
                app.push_log(format!("Loaded {} cached secrets", names.len()));
            }
        }

        Ok(app)
    }

    pub fn push_log(&mut self, msg: impl Into<String>) {
        self.logs.push(msg.into());
        if self.logs.len() > 500 {
            let drain = self.logs.len() - 500;
            self.logs.drain(0..drain);
        }
    }

    pub fn build_secrets_tree(&mut self, secret_names: &[String]) {
        self.secrets_tree = build_tree(secret_names);
        self.all_secret_names = secret_names.to_vec();
        self.update_search_results();
    }

    pub fn update_search_results(&mut self) {
        self.filtered_secrets = filter_secrets(&self.all_secret_names, &self.search_query);
    }

    fn handle_async_results(&mut self) {
        // Handle status updates
        if let Some(rx) = &self.status_rx {
            if let Ok(msg) = rx.try_recv() {
                self.status = msg.clone();
                self.push_log(msg);
            }
        }

        // Handle secret fetch results
        if let Some(rx) = &self.secret_result_rx {
            if let Ok(res) = rx.try_recv() {
                match res {
                    Ok((s, b)) => {
                        if let Some(text) = s {
                            // pretty JSON if possible
                            if let Ok(json) = serde_json::from_str::<JsonValue>(&text) {
                                self.editor_content =
                                    serde_json::to_string_pretty(&json).unwrap_or(text);
                                self.editor_is_binary = false;
                                self.push_log("Fetched secret: JSON string");
                            } else {
                                self.editor_content = text;
                                self.editor_is_binary = false;
                                self.push_log("Fetched secret: plain string");
                            }
                            self.status = "Fetched string secret".to_string();
                        } else if let Some(bytes) = b {
                            self.editor_content = BASE64.encode(&bytes);
                            self.editor_is_binary = true;
                            self.status = "Fetched binary secret (base64)".to_string();
                            self.push_log("Fetched secret: binary (base64)");
                        } else {
                            self.status = "Empty secret".to_string();
                            self.push_log("Fetched secret: empty");
                        }
                    }
                    Err(e) => {
                        self.status = format!("Error: {e}");
                        self.push_log(format!("Fetch error: {e}"));
                    }
                }
            }
        }

        // Handle save results
        if let Some(rx) = &self.save_result_rx {
            if let Ok(res) = rx.try_recv() {
                match res {
                    Ok(msg) => {
                        self.status = msg.clone();
                        self.push_log(msg);
                        self.is_editing = false;
                        self.is_creating_new = false;
                    }
                    Err(e) => {
                        self.status = format!("Save error: {e}");
                        self.push_log(format!("Save error: {e}"));
                    }
                }
            }
        }

        // Handle list secrets results
        if let Some(rx) = &self.list_secrets_rx {
            if let Ok(res) = rx.try_recv() {
                match res {
                    Ok(secret_names) => {
                        self.build_secrets_tree(&secret_names);
                        self.status = format!("Loaded {} secrets", secret_names.len());
                        self.push_log(format!("Loaded {} secrets", secret_names.len()));
                        // Save cache to disk for default/selected profile
                        if let Some(p) = self
                            .selected_profile
                            .clone()
                            .or_else(|| self.default_profile.clone())
                        {
                            Config::save_cached_secret_names(&p, &secret_names);
                        }
                    }
                    Err(e) => {
                        self.status = format!("Error listing secrets: {e}");
                        self.push_log(format!("List secrets error: {e}"));
                    }
                }
            }
        }
    }
}

impl App for SecManagerApp {
    fn update(&mut self, ctx: &egui::Context, _frame: &mut eframe::Frame) {
        // Handle async results
        self.handle_async_results();

        // Left sidebar - profiles
        egui::SidePanel::left("sidebar").show(ctx, |ui| {
            ui.heading("Profiles");
            ui.separator();
            let current = self
                .selected_profile
                .clone()
                .or(self.default_profile.clone())
                .unwrap_or_else(|| "default".to_string());
            egui::ComboBox::from_label("Select profile")
                .selected_text(&current)
                .show_ui(ui, |ui| {
                    for name in &self.profiles {
                        if ui.selectable_label(current == *name, name).clicked() {
                            self.selected_profile = Some(name.clone());
                        }
                    }
                });
            ui.separator();
            if ui.button("Set as default").clicked() {
                if let Some(p) = self.selected_profile.clone() {
                    Config::save_default_profile(&p);
                    self.default_profile = Some(p);
                    self.status = "Saved default profile".to_string();
                    self.push_log("Saved default profile");
                }
            }
            ui.separator();
            if ui.button("📋 List Secrets").clicked() {
                self.status = "Listing secrets...".to_string();
                self.push_log("Listing secrets...");
                self.show_secrets_tree = true;
                if let Some(p) = self
                    .selected_profile
                    .clone()
                    .or_else(|| self.default_profile.clone())
                {
                    // Try cache first
                    if let Some(cached) = Config::load_cached_secret_names(&p) {
                        self.build_secrets_tree(&cached);
                        self.status = format!("Loaded {} cached secrets", cached.len());
                        self.push_log(format!("Loaded {} cached secrets", cached.len()));
                    } else {
                        let (tx, rx) = mpsc::channel();
                        self.list_secrets_rx = Some(rx);
                        tokio::spawn(async move {
                            let res = list_secrets(Some(&p)).await;
                            let _ = tx.send(res);
                        });
                    }
                } else {
                    self.status = "No profile selected".to_string();
                    self.push_log("No profile selected");
                }
            }
            // Force reload button
            if ui.button("🔄 Force Reload").clicked() {
                self.status = "Reloading secrets from AWS...".to_string();
                self.push_log("Force reloading secrets...");
                self.show_secrets_tree = true;
                if let Some(p) = self
                    .selected_profile
                    .clone()
                    .or_else(|| self.default_profile.clone())
                {
                    let (tx, rx) = mpsc::channel();
                    self.list_secrets_rx = Some(rx);
                    tokio::spawn(async move {
                        let res = list_secrets(Some(&p)).await;
                        let _ = tx.send(res);
                    });
                } else {
                    self.status = "No profile selected".to_string();
                    self.push_log("No profile selected");
                }
            }
            ui.separator();
            if ui.button("Check SSO").clicked() {
                self.status = "Checking SSO...".to_string();
                self.push_log("Checking SSO...");
                if let Some(p) = self
                    .selected_profile
                    .clone()
                    .or_else(|| self.default_profile.clone())
                {
                    let (tx, rx) = mpsc::channel();
                    self.status_rx = Some(rx);
                    // Try STS first
                    tokio::spawn(async move {
                        let ok = check_sts(&p).await;
                        if ok {
                            let _ = tx.send("SSO valid".to_string());
                            return;
                        }
                        // Trigger login
                        let _ = std::process::Command::new("aws")
                            .args(["sso", "login", "--profile", &p])
                            .spawn();
                        let _ = tx.send("Opened SSO login in browser...".to_string());
                        // Poll until valid or timeout
                        for _ in 0..20 {
                            tokio::time::sleep(std::time::Duration::from_secs(3)).await;
                            if check_sts(&p).await {
                                let _ = tx.send("SSO valid".to_string());
                                return;
                            }
                        }
                        let _ = tx.send("SSO still invalid after waiting".to_string());
                    });
                } else {
                    self.status = "No profile selected".to_string();
                    self.push_log("No profile selected");
                }
            }
        });

        // Secrets tree panel
        if self.show_secrets_tree {
            egui::SidePanel::right("secrets_tree")
                .resizable(true)
                .default_width(300.0)
                .show(ctx, |ui| {
                    ui.heading("Secrets Tree");
                    ui.separator();

                    // Search box
                    ui.horizontal(|ui| {
                        ui.label("🔍 Search:");
                        let search_response = ui.text_edit_singleline(&mut self.search_query);
                        if search_response.changed() {
                            self.update_search_results();
                        }

                        if !self.search_query.is_empty() && ui.small_button("✖").clicked() {
                            self.search_query.clear();
                            self.update_search_results();
                        }
                    });

                    ui.separator();

                    // Show search results or tree view
                    if !self.search_query.trim().is_empty() {
                        render_search_results(self, ui);
                    } else {
                        render_tree_view(self, ui);
                    }
                });
        }

        // Top bar
        self.render_top_bar(ctx);

        // Bottom panel
        self.render_bottom_panel(ctx);

        // Central content - editor area
        self.render_central_panel(ctx);
    }
}

impl SecManagerApp {
    fn render_top_bar(&mut self, ctx: &egui::Context) {
        egui::TopBottomPanel::top("topbar")
            .min_height(56.0)
            .show(ctx, |ui| {
                ui.horizontal(|ui| {
                    ui.label("Secret ID:");
                    ui.text_edit_singleline(&mut self.secret_id_input);

                    // Show current mode indicator
                    if self.is_creating_new {
                        ui.label(egui::RichText::new("🟢 CREATE MODE").color(egui::Color32::GREEN));
                    } else if self.is_editing {
                        ui.label(
                            egui::RichText::new("🔴 EDIT MODE").color(egui::Color32::DARK_RED),
                        );
                    }

                    self.render_action_buttons(ui);
                });

                // Second row for description when editing
                if self.is_editing {
                    ui.horizontal(|ui| {
                        ui.label("Description:");
                        ui.text_edit_singleline(&mut self.secret_description);
                    });
                }
            });
    }

    fn render_action_buttons(&mut self, ui: &mut egui::Ui) {
        // Get Secret button
        let can_get = !self.is_editing;
        let mut get_btn = ui.add_enabled(can_get, egui::Button::new("📖 Get Secret"));
        if !can_get {
            get_btn = get_btn.on_disabled_hover_text("Cancel edit first to prevent data loss");
        }
        if get_btn.clicked() {
            self.fetch_current_secret();
        }

        // Edit button
        let can_edit =
            !self.editor_content.is_empty() && !self.secret_id_input.is_empty() && !self.is_editing;
        let mut edit_btn = ui.add_enabled(can_edit, egui::Button::new("📝 Edit"));
        if !can_edit && self.is_editing {
            edit_btn = edit_btn.on_disabled_hover_text("Already in edit mode");
        } else if !can_edit {
            edit_btn = edit_btn.on_disabled_hover_text("Get a secret first to edit");
        }
        if edit_btn.clicked() {
            self.is_editing = true;
            self.is_creating_new = false;
            self.status = "Edit mode enabled".to_string();
            self.push_log("Switched to edit mode");
        }

        // New Secret button
        let can_create_new = !self.is_editing;
        let mut new_btn = ui.add_enabled(can_create_new, egui::Button::new("➕ New Secret"));
        if !can_create_new {
            new_btn = new_btn.on_disabled_hover_text("Finish current edit first");
        }
        if new_btn.clicked() {
            self.is_creating_new = true;
            self.is_editing = true;
            self.editor_content = String::new();
            self.secret_description = String::new();
            self.secret_id_input = String::new();
            self.status = "Create new secret mode".to_string();
            self.push_log("Switched to create new secret mode");
        }
    }

    fn fetch_current_secret(&mut self) {
        self.status = "Fetching secret...".to_string();
        self.push_log(format!("Fetching secret: {}", self.secret_id_input));
        let secret_id = self.secret_id_input.clone();
        let profile = self
            .selected_profile
            .clone()
            .or(self.default_profile.clone());
        let (tx, rx) = mpsc::channel();
        self.secret_result_rx = Some(rx);
        self.is_editing = false;
        self.is_creating_new = false;
        tokio::spawn(async move {
            let res = fetch_secret(profile.as_deref(), &secret_id).await;
            let _ = tx.send(res);
        });
    }

    fn render_central_panel(&mut self, ctx: &egui::Context) {
        egui::CentralPanel::default().show(ctx, |ui| {
            ui.separator();
            let ctx_clone = ctx.clone();
            ui.horizontal(|ui| {
                ui.label("Secret content:");
                if ui.button("Copy").clicked() {
                    ctx_clone.copy_text(self.editor_content.clone());
                    self.push_log("Copied secret content to clipboard");
                }

                // Edit controls when in editing mode
                if self.is_editing {
                    ui.separator();
                    if ui.button("💾 Save").clicked() {
                        self.save_secret();
                    }

                    if ui.button("❌ Cancel").clicked() {
                        self.is_editing = false;
                        self.is_creating_new = false;
                        self.status = "Edit cancelled".to_string();
                        self.push_log("Edit mode cancelled");
                    }
                }
            });

            egui::ScrollArea::vertical().show(ui, |ui| {
                let mut editor = egui::TextEdit::multiline(&mut self.editor_content)
                    .font(egui::TextStyle::Monospace)
                    .code_editor()
                    .desired_rows(20)
                    .desired_width(ui.available_width());

                // Make readonly if not editing
                if !self.is_editing {
                    editor = editor.interactive(false);
                }

                ui.add(editor);

                if self.editor_is_binary {
                    ui.small("Displayed as base64 (binary secret)");
                } else if self.is_editing {
                    ui.small("✏️ Edit mode - you can modify content");
                } else {
                    ui.small("📖 Read-only - click Edit to modify");
                }
            });
        });
    }

    fn render_bottom_panel(&mut self, ctx: &egui::Context) {
        egui::TopBottomPanel::bottom("bottom_panel")
            .resizable(true)
            .default_height(180.0)
            .min_height(100.0)
            .max_height(400.0)
            .show(ctx, |ui| {
                // Logs section
                ui.horizontal(|ui| {
                    ui.label(egui::RichText::new("Logs:").strong());
                    ui.with_layout(Layout::right_to_left(Align::Center), |ui| {
                        if ui.small_button("Clear").clicked() {
                            self.logs.clear();
                            self.push_log("Logs cleared");
                        }
                    });
                });

                egui::ScrollArea::vertical()
                    .auto_shrink([false, false])
                    .stick_to_bottom(true)
                    .show(ui, |ui| {
                        for (i, line) in self.logs.iter().enumerate() {
                            ui.horizontal(|ui| {
                                ui.small(format!("{:03}", i + 1));
                                ui.separator();
                                ui.monospace(line);
                            });
                        }
                    });
            });

        egui::TopBottomPanel::bottom("status_bar")
            .min_height(32.0)
            .show(ctx, |ui| {
                ui.horizontal(|ui| {
                    // Status on the left
                    ui.label(egui::RichText::new(&self.status).color(egui::Color32::LIGHT_BLUE));

                    // Spacer to push buttons to the right
                    ui.with_layout(Layout::right_to_left(Align::Center), |ui| {
                        // Only show Delete when not creating new secret and has content
                        if !self.is_creating_new && !self.secret_id_input.is_empty() {
                            if ui.button("🗑 Delete").clicked() {
                                self.status = "Delete not implemented in UI thread".to_string();
                                self.push_log("Delete clicked (not implemented)");
                            }
                        } else {
                            // Show disabled delete button with tooltip when creating new
                            ui.add_enabled(false, egui::Button::new("🗑 Delete"))
                                .on_disabled_hover_text("Cannot delete while creating new secret");
                        }
                    });
                });
            });
    }

    fn save_secret(&mut self) {
        if self.secret_id_input.trim().is_empty() {
            self.status = "Secret ID cannot be empty".to_string();
            self.push_log("Save failed: Secret ID cannot be empty");
            return;
        }

        let secret_id = self.secret_id_input.clone();
        let secret_value = self.editor_content.clone();
        let description = if self.secret_description.trim().is_empty() {
            None
        } else {
            Some(self.secret_description.clone())
        };
        let profile = self
            .selected_profile
            .clone()
            .or(self.default_profile.clone());
        let is_creating = self.is_creating_new;

        let (tx, rx) = mpsc::channel();
        self.save_result_rx = Some(rx);

        if is_creating {
            self.status = "Creating secret...".to_string();
            self.push_log(format!("Creating secret: {secret_id}"));
            tokio::spawn(async move {
                let res = create_secret(
                    profile.as_deref(),
                    &secret_id,
                    &secret_value,
                    description.as_deref(),
                )
                .await;
                let _ = tx.send(res);
            });
        } else {
            self.status = "Updating secret...".to_string();
            self.push_log(format!("Updating secret: {secret_id}"));
            tokio::spawn(async move {
                let res = update_secret(
                    profile.as_deref(),
                    &secret_id,
                    &secret_value,
                    description.as_deref(),
                )
                .await;
                let _ = tx.send(res);
            });
        }
    }
}
