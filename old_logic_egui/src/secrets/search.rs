pub fn filter_secrets(secret_names: &[String], query: &str) -> Vec<String> {
    if query.trim().is_empty() {
        return Vec::new();
    }

    let query_lower = query.to_lowercase();
    let mut filtered: Vec<String> = secret_names
        .iter()
        .filter(|name| name.to_lowercase().contains(&query_lower))
        .cloned()
        .collect();

    // Sort results by relevance (exact matches first, then contains)
    filtered.sort_by(|a, b| {
        let a_lower = a.to_lowercase();
        let b_lower = b.to_lowercase();
        let a_exact = a_lower == query_lower;
        let b_exact = b_lower == query_lower;
        let a_starts = a_lower.starts_with(&query_lower);
        let b_starts = b_lower.starts_with(&query_lower);

        match (a_exact, b_exact) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => match (a_starts, b_starts) {
                (true, false) => std::cmp::Ordering::Less,
                (false, true) => std::cmp::Ordering::Greater,
                _ => a.cmp(b),
            },
        }
    });

    filtered
}

pub fn find_match_range(text: &str, query: &str) -> Option<(usize, usize)> {
    let text_lower = text.to_lowercase();
    let query_lower = query.to_lowercase();

    text_lower.find(&query_lower).map(|start| {
        let end = start + query.len();
        (start, end)
    })
}
