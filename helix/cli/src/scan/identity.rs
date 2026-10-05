//! What a finding is about, who fixes it, how serious it is, and which finding
//! it is from one run to the next.
//!
//! **Byte for byte the page's.** `@fusion.dev/helix-diagnostics` gives a
//! finding its category, owner, severity, and fingerprint in `identity.ts` and
//! `rules.ts`, and a dashboard joins a scan's findings to a page's by the
//! fingerprint. So every table and every step here is a port of those files,
//! and the tests hold fingerprints the TypeScript printed.

use std::sync::LazyLock;

use regex::Regex;

/// Every fault class, stable across versions, as `report.ts` lists them.
pub const KINDS: [&str; 8] = [
    "dead-hook",
    "dead-part",
    "duplicate-registration",
    "invalid-value",
    "manifest-skew",
    "unforwarded-part",
    "unknown-attribute",
    "unknown-tag",
];

/// What a fault is about: `styling` for parts and hooks, `markup` for
/// attributes, and `integrity` for the page and the library disagreeing.
pub fn category(kind: &str) -> &'static str {
    match kind {
        "dead-hook" | "dead-part" | "unforwarded-part" => "styling",
        "invalid-value" | "unknown-attribute" => "markup",
        _ => "integrity",
    }
}

/// Who fixes a fault. An unforwarded part is Helix's: the headless tier
/// publishes it and the styled tier never forwarded it.
pub fn owner(kind: &str) -> &'static str {
    if kind == "unforwarded-part" {
        "helix"
    } else {
        "consumer"
    }
}

/// The shipped severity of each kind: a warning for the fault that is
/// Helix's, and an error for everything that does nothing where it was
/// written.
pub fn shipped(kind: &str) -> &'static str {
    if kind == "unforwarded-part" {
        "warn"
    } else {
        "error"
    }
}

static WEBPACK: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"___[A-Za-z0-9_-]{5}(?-u:\b)").expect("a literal pattern"));
static NEXT: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"__[A-Za-z0-9_-]{6}__").expect("a literal pattern"));
static VITE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?-u:\b)(_[A-Za-z][A-Za-z0-9-]*)_[a-z0-9]{5}_[0-9]+(?-u:\b)")
        .expect("a literal pattern")
});
static SPACE: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"\s+").expect("a literal pattern"));

/// A subject with what a build changes taken out: the hash in a CSS Modules
/// class name, each bundler's own way, and the spacing a minifier rewrites.
pub fn normalize(subject: &str) -> String {
    let text = WEBPACK.replace_all(subject, "");
    let text = NEXT.replace_all(&text, "__");
    let text = VITE.replace_all(&text, "$1");
    SPACE.replace_all(&text, " ").trim().to_owned()
}

/// cyrb53, as `identity.ts` writes it: over UTF-16 code units, with
/// JavaScript's 32-bit multiply, so the same text hashes the same in both.
fn hash(text: &str) -> String {
    let mut one: u32 = 0xdead_beef;
    let mut two: u32 = 0x41c6_ce57;
    for code in text.encode_utf16() {
        one = (one ^ u32::from(code)).wrapping_mul(2_654_435_761);
        two = (two ^ u32::from(code)).wrapping_mul(1_597_334_677);
    }
    one = (one ^ (one >> 16)).wrapping_mul(2_246_822_507)
        ^ (two ^ (two >> 13)).wrapping_mul(3_266_489_909);
    two = (two ^ (two >> 16)).wrapping_mul(2_246_822_507)
        ^ (one ^ (one >> 13)).wrapping_mul(3_266_489_909);
    let value = u64::from(two & 2_097_151) * 4_294_967_296 + u64::from(one);
    format!("{value:014x}")
}

/// A finding's identity across runs: its kind, its tag, and its normalized
/// subject. The file is left out, so the same mistake in two files is one
/// issue seen twice.
pub fn fingerprint(kind: &str, tag: &str, subject: &str) -> String {
    hash(&format!("{kind}\u{0}{tag}\u{0}{}", normalize(subject)))
}

/// The name in `candidates` closest to `wrong`, or `None` where none is
/// within `ceiling` edits, and never more than a third of the name.
///
/// **The page's suggestion, step for step**: the same ceiling, and on a tie
/// the later candidate, so a scan and a page suggest the same name.
pub fn nearest<'a>(
    wrong: &str,
    candidates: impl IntoIterator<Item = &'a str>,
    ceiling: Option<usize>,
) -> Option<&'a str> {
    let from: Vec<u16> = wrong.encode_utf16().collect();
    let third = from.len() / 3;
    let mut distance = ceiling.map_or(third, |ceiling| ceiling.min(third));
    let mut best = None;
    for candidate in candidates {
        let to: Vec<u16> = candidate.encode_utf16().collect();
        if let Some(found) = within(&from, &to, distance) {
            best = Some(candidate);
            distance = found;
        }
    }
    best
}

/// The edit distance between two names, or `None` once it is certainly over
/// the ceiling.
fn within(from: &[u16], to: &[u16], ceiling: usize) -> Option<usize> {
    if from.len().abs_diff(to.len()) > ceiling {
        return None;
    }
    let mut previous: Vec<usize> = (0..=to.len()).collect();
    for row in 1..=from.len() {
        let mut current = vec![row; to.len() + 1];
        let mut least = row;
        for column in 1..=to.len() {
            let replace = previous[column - 1] + usize::from(from[row - 1] != to[column - 1]);
            let cell = (previous[column] + 1)
                .min(current[column - 1] + 1)
                .min(replace);
            current[column] = cell;
            least = least.min(cell);
        }
        if least > ceiling {
            return None;
        }
        previous = current;
    }
    let total = previous[to.len()];
    (total <= ceiling).then_some(total)
}

#[cfg(test)]
mod tests {
    use super::{fingerprint, nearest, normalize};

    /// Printed by `fingerprintOf` in `@fusion.dev/helix-diagnostics`, so a
    /// scan's finding and a page's finding for the same fault join.
    #[test]
    fn fingerprints_are_the_pages() {
        for (kind, tag, subject, expected) in [
            (
                "dead-part",
                "helix-button",
                "helix-button::part(lable)",
                "0c0e3fd7cca878",
            ),
            (
                "dead-hook",
                "helix-card",
                ".trace-graph-module__lFhy0q__traceFrame { --card-pading }",
                "0c2fb58ca2993c",
            ),
            (
                "invalid-value",
                "helix-button",
                "<helix-button emphasis=\"bold\">",
                "1b15aa475aeaa6",
            ),
            (
                "unknown-attribute",
                "helix-tag",
                "<helix-tag tonee>",
                "0a66938633be44",
            ),
            (
                "dead-hook",
                "helix-card",
                "._title_1a2b3_7   helix-card { --card-x }",
                "1649ba4ea5b1c4",
            ),
            (
                "dead-part",
                "helix-card",
                "é ünïcode ☃ 𝒳 helix-card::part(x)",
                "1024656ef54ce6",
            ),
        ] {
            assert_eq!(fingerprint(kind, tag, subject), expected, "{subject}");
        }
    }

    #[test]
    fn a_build_hash_is_normalized_away() {
        assert_eq!(
            normalize(".trace-graph-module__lFhy0q__traceFrame { --x }"),
            ".trace-graph-module__traceFrame { --x }"
        );
        assert_eq!(normalize("._title_1a2b3_7   a"), "._title a");
        assert_eq!(normalize(".card__title___3xYz1"), ".card__title");
    }

    #[test]
    fn a_suggestion_is_within_a_third_of_the_name() {
        let hooks = ["--breadcrumbs-hover-color", "--breadcrumbs-gap"];
        assert_eq!(
            nearest("--breadcrumb-hover-color", hooks, Some(2)),
            Some("--breadcrumbs-hover-color")
        );
        assert_eq!(
            nearest("--button-x", ["--button-background-color"], None),
            None
        );
    }
}
