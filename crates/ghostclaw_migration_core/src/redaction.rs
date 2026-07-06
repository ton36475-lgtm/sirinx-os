//! Secret redaction helpers for receipts and responses.

const SENSITIVE_MARKERS: &[&str] = &[
    "api_key",
    "apikey",
    "secret",
    "token",
    "password",
    "credential",
    "private_key",
    "sk-",
    "sk_",
    "sk-or-",
    "ghp_",
    "xoxb-",
];

/// Redacts token-like words and key/value secret fragments.
pub fn redact_sensitive(input: &str) -> String {
    input
        .split_whitespace()
        .map(redact_word)
        .collect::<Vec<_>>()
        .join(" ")
}

fn redact_word(word: &str) -> String {
    let lower = word.to_ascii_lowercase();
    if SENSITIVE_MARKERS
        .iter()
        .any(|marker| lower.contains(marker))
    {
        if let Some((key, _value)) = word.split_once('=') {
            return format!("{key}=[REDACTED_SECRET]");
        }
        if let Some((key, _value)) = word.split_once(':') {
            return format!("{key}:[REDACTED_SECRET]");
        }
        return "[REDACTED_SECRET]".to_string();
    }
    word.to_string()
}

#[cfg(test)]
mod tests {
    use super::redact_sensitive;

    #[test]
    fn redact_sensitive_should_mask_token_like_words() {
        assert_eq!(
            redact_sensitive("use token=abc sk-or-v1-example now"),
            "use token=[REDACTED_SECRET] [REDACTED_SECRET] now"
        );
    }
}
