//! What the options of a `@property({ … })` say, read one way by every rule.
//!
//! **Three rules each held their own copy of these, and all three read one
//! spelling.** `attribute: 'x'` was found and `attribute: "x"`, which is what a
//! formatter configured for double quotes writes, was not: `selectors` then
//! reported a host selector on an attribute the component declares, and
//! `reachable` missed a property that did not reflect. The booleans were read
//! as exact text, so `reflect:true` without its space was never reflected.

use std::sync::LazyLock;

use regex::Regex;

static ATTRIBUTE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r#"\battribute\s*:\s*(?:'([^']+)'|"([^"]+)")"#).expect("a literal pattern compiles")
});

static UNATTRIBUTED: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"\battribute\s*:\s*false\b").expect("a literal pattern compiles"));

static REFLECTS: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"\breflect\s*:\s*true\b").expect("a literal pattern compiles"));

/// The attribute the options name for the property, in either quote.
pub fn attribute(options: &str) -> Option<String> {
    ATTRIBUTE
        .captures(options)
        .and_then(|found| found.get(1).or_else(|| found.get(2)))
        .map(|one| one.as_str().to_owned())
}

/// Whether the options say the property has no attribute at all.
pub fn unattributed(options: &str) -> bool {
    UNATTRIBUTED.is_match(options)
}

/// Whether the options say the property reflects.
pub fn reflects(options: &str) -> bool {
    REFLECTS.is_match(options)
}

#[cfg(test)]
mod tests {
    use super::{attribute, reflects, unattributed};

    #[test]
    fn either_quote_names_the_attribute_and_spacing_does_not_matter() {
        assert_eq!(attribute("{ attribute: 'a-b' }").as_deref(), Some("a-b"));
        assert_eq!(attribute(r#"{ attribute: "a-b" }"#).as_deref(), Some("a-b"));
        assert_eq!(attribute("{ attribute:false }"), None);
        assert!(unattributed("{ attribute:false }"));
        assert!(reflects("{ reflect:true, type: Boolean }"));
        assert!(!reflects("{ reflect: false }"));
    }
}
