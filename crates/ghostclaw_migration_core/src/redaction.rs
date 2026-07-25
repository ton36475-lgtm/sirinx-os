//! Secret redaction helpers for receipts and responses.

const SENSITIVE_KEYS: &[&str] = &[
    "api_key",
    "apikey",
    "authorization",
    "client_secret",
    "cookie",
    "credential",
    "credentials",
    "password",
    "private_key",
    "refresh_token",
    "secret",
    "session_cookie",
    "token",
];

const SENSITIVE_PREFIXES: &[&str] = &["akia", "ghp_", "kob_", "sk-", "sk_", "sk-or-", "xoxb-"];

const REDACTED: &str = "[REDACTED_SECRET]";

/// Redacts token-like words and key/value secret fragments.
pub fn redact_sensitive(input: &str) -> String {
    let mut redact_following = 0usize;
    let mut output = Vec::new();

    for word in input.split_whitespace() {
        if redact_following > 0 {
            output.push(REDACTED.to_string());
            redact_following -= 1;
            continue;
        }

        let normalized = normalize_key(word);
        if is_probable_secret_literal(word) || matches!(normalized.as_str(), "bearer" | "basic") {
            output.push(REDACTED.to_string());
            if matches!(normalized.as_str(), "bearer" | "basic") {
                redact_following = 1;
            }
            continue;
        }

        if let Some((key, delimiter, value)) = split_key_value(word) {
            if is_sensitive_key(key) {
                output.push(format!("{key}{delimiter}{REDACTED}"));
                let key_name = normalize_key(key);
                if key_name == "authorization" {
                    redact_following = if value.is_empty() { 2 } else { 1 };
                } else if value.is_empty() {
                    redact_following = 1;
                }
                continue;
            }
        }

        if is_sensitive_key(word) {
            output.push(word.to_string());
            redact_following = 1;
        } else {
            output.push(word.to_string());
        }
    }

    output.join(" ")
}

fn split_key_value(word: &str) -> Option<(&str, char, &str)> {
    let (index, delimiter) = word
        .char_indices()
        .find(|(_index, ch)| matches!(ch, '=' | ':'))?;
    Some((
        &word[..index],
        delimiter,
        &word[index + delimiter.len_utf8()..],
    ))
}

fn normalize_key(word: &str) -> String {
    word.trim_matches(|ch: char| !ch.is_ascii_alphanumeric() && ch != '_')
        .to_ascii_lowercase()
}

fn is_sensitive_key(word: &str) -> bool {
    let normalized = normalize_key(word);
    SENSITIVE_KEYS.iter().any(|key| {
        normalized == *key
            || normalized
                .strip_suffix(key)
                .is_some_and(|prefix| prefix.ends_with('_'))
    })
}

fn is_probable_secret_literal(word: &str) -> bool {
    let candidate = word.trim_matches(|ch: char| matches!(ch, '"' | '\'' | ',' | ';'));
    let lower = candidate.to_ascii_lowercase();
    if SENSITIVE_PREFIXES
        .iter()
        .any(|prefix| lower.starts_with(prefix))
    {
        return true;
    }

    let jwt_parts = candidate.split('.').collect::<Vec<_>>();
    candidate.len() >= 20
        && jwt_parts.len() == 3
        && jwt_parts.iter().all(|part| {
            !part.is_empty()
                && part
                    .chars()
                    .all(|ch| ch.is_ascii_alphanumeric() || matches!(ch, '-' | '_' | '='))
        })
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

    #[test]
    fn redact_sensitive_should_mask_values_following_bare_keys() {
        assert_eq!(
            redact_sensitive("api_key abc123 provider ok"),
            "api_key [REDACTED_SECRET] provider ok"
        );
    }

    #[test]
    fn redact_sensitive_should_mask_authorization_scheme_and_value() {
        assert_eq!(
            redact_sensitive("Authorization: Bearer abc123 request"),
            "Authorization:[REDACTED_SECRET] [REDACTED_SECRET] [REDACTED_SECRET] request"
        );
    }

    #[test]
    fn redact_sensitive_should_mask_jwt_shaped_values() {
        assert_eq!(
            redact_sensitive("eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0In0.signature"),
            "[REDACTED_SECRET]"
        );
    }

    #[test]
    fn redact_sensitive_should_not_mask_unrelated_substrings() {
        assert_eq!(
            redact_sensitive("tokenizer secretariat"),
            "tokenizer secretariat"
        );
    }
}
