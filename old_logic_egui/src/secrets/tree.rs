use std::collections::HashMap;

#[derive(Debug, Clone, Default)]
pub struct SecretNode {
    pub name: String,
    pub full_path: String,
    pub is_leaf: bool,
    pub children: HashMap<String, SecretNode>,
    pub expanded: bool,
}

impl SecretNode {
    pub fn new(name: String, full_path: String, is_leaf: bool) -> Self {
        Self {
            name,
            full_path,
            is_leaf,
            children: HashMap::new(),
            expanded: false,
        }
    }
}

pub fn build_tree(secret_names: &[String]) -> SecretNode {
    let mut root = SecretNode::new("root".to_string(), "".to_string(), false);

    for secret_name in secret_names {
        let parts: Vec<&str> = secret_name.split('/').collect();
        insert_path(&mut root, &parts, secret_name);
    }

    root
}

fn insert_path(node: &mut SecretNode, parts: &[&str], full_path: &str) {
    if parts.is_empty() {
        return;
    }

    let current = parts[0];
    let is_leaf = parts.len() == 1;

    if !node.children.contains_key(current) {
        node.children.insert(
            current.to_string(),
            SecretNode::new(current.to_string(), full_path.to_string(), is_leaf),
        );
    }

    if !is_leaf {
        if let Some(child) = node.children.get_mut(current) {
            insert_path(child, &parts[1..], full_path);
        }
    }
}
