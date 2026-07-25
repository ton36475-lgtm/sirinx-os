//! Which vendor a model belongs to, and therefore which lane serves it first.
//!
//! P098 Rev G routes by family rather than by provider, because the measurements
//! did not point at one provider for everything: alibaba beat maxplus on every id
//! they share, but cointh beat alibaba on GLM by a wider margin than alibaba won
//! anywhere else. Sending GLM to alibaba because alibaba is "generally faster"
//! would be slower for GLM specifically.

use serde::{Deserialize, Serialize};

/// Model families that have a preferred lane.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum Family {
    /// GLM / ChatGLM — fastest on cointh.
    Glm,
    /// Qwen — alibaba is the vendor.
    Qwen,
    /// DeepSeek — fastest on alibaba.
    DeepSeek,
    /// Moonshot Kimi — fastest on alibaba.
    Kimi,
    /// Anthropic Claude — only reachable through the maxplus VIP pool.
    Claude,
    /// Anything with no measured preference.
    Other,
}

/// Classify a model id by prefix.
///
/// Deliberately prefix matching on the id rather than a lookup table: the
/// registries list 151 ids on one lane alone, and a table would be stale the
/// first time a vendor ships a point release.
pub fn family_of(model: &str) -> Family {
    let m = model.to_ascii_lowercase();
    if m.starts_with("glm") {
        Family::Glm
    } else if m.starts_with("qwen") || m.starts_with("qwq") || m.starts_with("qvq") {
        Family::Qwen
    } else if m.starts_with("deepseek") {
        Family::DeepSeek
    } else if m.starts_with("kimi") || m.starts_with("moonshot") {
        Family::Kimi
    } else if m.starts_with("claude") {
        Family::Claude
    } else {
        Family::Other
    }
}

/// Lane names in the order Rev G prefers them for a family.
///
/// The leaf and the Rev E remainder are appended by the router, so this only
/// answers "who goes first".
pub fn preferred_lanes(family: Family) -> &'static [&'static str] {
    match family {
        // cointh 1265 ms vs alibaba 1676 ms vs maxplus 3610 ms on glm-5.2.
        Family::Glm => &["cointh", "alibaba"],
        // Alibaba is the vendor; nothing else measured close.
        Family::Qwen => &["alibaba"],
        // alibaba 870 ms vs maxplus 3112 ms on deepseek-v4-flash.
        Family::DeepSeek => &["alibaba"],
        // alibaba 941 ms vs maxplus 2096 ms on kimi-k2.7-code.
        Family::Kimi => &["alibaba"],
        // Not served by cointh or alibaba at all — only the maxplus VIP pool,
        // which is the leaf. Nothing to prefer above it.
        Family::Claude => &[],
        Family::Other => &[],
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn every_id_in_the_registries_classifies() {
        // Ids taken from config/models.{alibaba,cointh,maxplus}.json.
        let cases = [
            ("glm-5.2", Family::Glm),
            ("glm-4.5-air", Family::Glm),
            ("glm-5.2-fast-preview", Family::Glm),
            ("qwen3.7-max", Family::Qwen),
            ("qwen3.7-max-preview", Family::Qwen),
            ("qwen3.6-flash", Family::Qwen),
            ("qwq-plus", Family::Qwen),
            ("deepseek-v4-pro", Family::DeepSeek),
            ("deepseek-v4-flash", Family::DeepSeek),
            ("kimi-k2.7-code", Family::Kimi),
            ("kimi-k3", Family::Kimi),
            ("claude-opus-4-8", Family::Claude),
            ("hy3", Family::Other),
            ("minimax-m3", Family::Other),
            ("mimo-v2.5", Family::Other),
        ];
        for (id, want) in cases {
            assert_eq!(family_of(id), want, "{id}");
        }
    }

    #[test]
    fn glm_prefers_cointh_over_alibaba() {
        // The measurement that made this per-family instead of per-provider.
        assert_eq!(preferred_lanes(Family::Glm), &["cointh", "alibaba"]);
    }

    #[test]
    fn qwen_deepseek_and_kimi_all_prefer_alibaba() {
        for f in [Family::Qwen, Family::DeepSeek, Family::Kimi] {
            assert_eq!(preferred_lanes(f), &["alibaba"], "{f:?}");
        }
    }

    #[test]
    fn claude_has_no_preferred_lane_above_the_leaf() {
        // cointh serves GLM only; alibaba's catalogue has no Claude. Claude is
        // reachable through maxplus and nowhere else, so it starts at the leaf.
        assert!(preferred_lanes(Family::Claude).is_empty());
    }

    #[test]
    fn an_unknown_id_gets_no_preference_rather_than_a_wrong_one() {
        assert_eq!(family_of("some-model-shipped-tomorrow"), Family::Other);
        assert!(preferred_lanes(Family::Other).is_empty());
    }

    #[test]
    fn classification_is_case_insensitive() {
        assert_eq!(family_of("GLM-5.2"), Family::Glm);
        assert_eq!(family_of("Qwen3.7-Max"), Family::Qwen);
    }
}
