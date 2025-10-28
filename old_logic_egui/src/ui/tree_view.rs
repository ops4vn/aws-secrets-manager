use crate::app::SecManagerApp;
use crate::secrets::{SecretNode, fetch_secret};
use std::sync::mpsc;

pub fn render_tree_view(app: &mut SecManagerApp, ui: &mut egui::Ui) {
    let mut tree = std::mem::take(&mut app.secrets_tree);
    egui::ScrollArea::vertical().show(ui, |ui| {
        render_node(ui, &mut tree, 0, app);
    });
    app.secrets_tree = tree;
}

pub fn render_node(
    ui: &mut egui::Ui,
    node: &mut SecretNode,
    depth: usize,
    app: &mut SecManagerApp,
) {
    if node.name == "root" {
        // Render children of root
        let mut children: Vec<_> = node.children.iter_mut().collect();
        children.sort_by(|a, b| a.0.cmp(b.0));

        for (_, child) in children {
            render_node(ui, child, depth, app);
        }
        return;
    }

    let indent = "  ".repeat(depth);
    let icon = if node.is_leaf { "📄" } else { "📁" };

    ui.horizontal(|ui| {
        ui.add_space(depth as f32 * 20.0);

        if !node.is_leaf {
            let expand_text = if node.expanded { "▼" } else { "▶" };
            if ui.small_button(expand_text).clicked() {
                node.expanded = !node.expanded;
            }
        } else {
            ui.add_space(16.0); // Space for expand button
        }

        let label_text = format!("{} {} {}", indent, icon, node.name);
        let response = ui.selectable_label(false, label_text);

        if response.clicked() {
            if node.is_leaf {
                // Fetch secret content when clicking leaf
                fetch_secret_by_name(app, &node.full_path);
            } else {
                // Toggle expansion for folders
                node.expanded = !node.expanded;
            }
        }
    });

    // Render children if expanded
    if node.expanded && !node.is_leaf {
        let mut children: Vec<_> = node.children.iter_mut().collect();
        children.sort_by(|a, b| a.0.cmp(b.0));

        for (_, child) in children {
            render_node(ui, child, depth + 1, app);
        }
    }
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
