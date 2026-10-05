//! The faults a scan proves from the code, and the ones it leaves to the page.
//!
//! **The page's rules, judged from the text.** `analyze.ts` judges each rule
//! against the lint data and, where that cannot settle it, against the
//! elements the selector matches. A scan has the lint data and no elements,
//! so each of the page's rules splits in two:
//!
//! - **Proven from the text**: a part a tag does not publish, a tag no
//!   installed package publishes, a hook within two edits of one the tag has,
//!   an attribute a tag does not take, and a value outside the ones it allows.
//!   Each is a finding, with the page's kind and fingerprint.
//! - **Left to the page**: a hook set on a Helix tag that does not have it,
//!   where another tag does. The rule works where an element with the hook is
//!   inside the tag, and only the running page shows that, so the finding is
//!   `unsettled`, with the fingerprint the page's finding would have.
//!
//! **A hook set on a selector naming no Helix tag** is judged only for a
//! misspelling, as the page judges it. Whether anything under the selector
//! has the hook is the page's to say, and a scan says nothing about it.

use std::collections::{BTreeMap, HashMap, HashSet};
use std::sync::LazyLock;

use regex::Regex;

use super::css::StyleRule;
use super::identity::nearest;
use super::lint::{Allows, Index};
use super::markup::{Element, Value};

/// How far a misspelled hook may be from the real one: two edits, as the page
/// allows.
const HOOK_DISTANCE: usize = 2;

/// Attributes every element takes, whatever its lint data says: the global
/// ones HTML defines, as the page lists them.
const GLOBAL: [&str; 32] = [
    "accesskey",
    "autocapitalize",
    "autofocus",
    "class",
    "contenteditable",
    "defer-hydration",
    "dir",
    "draggable",
    "enterkeyhint",
    "exportparts",
    "hidden",
    "id",
    "inert",
    "inputmode",
    "is",
    "itemid",
    "itemprop",
    "itemref",
    "itemscope",
    "itemtype",
    "lang",
    "nonce",
    "part",
    "popover",
    "role",
    "slot",
    "spellcheck",
    "style",
    "tabindex",
    "title",
    "translate",
    "writingsuggestions",
];

/// Names a framework takes for itself and never writes to the element:
/// React's, Vue's, and Solid's `key` and `ref`. The page never sees them.
const FRAMEWORK: [&str; 2] = ["key", "ref"];

/// Attribute prefixes a page or a framework writes on any element.
const PREFIXES: [&str; 10] = [
    "aria-",
    "data-",
    "on",
    "_ngcontent-",
    "_nghost-",
    "ng-",
    "v-",
    "x-",
    ":",
    "@",
];

/// Where a finding was read: the file, its line, its position among the
/// file's rules, and the rule or the opening tag it sits in.
#[derive(Clone, Debug)]
pub struct Origin {
    pub index: usize,
    pub line: usize,
    pub sheet: String,
    pub text: String,
}

/// A finding as a check first writes it, before its identity and severity.
#[derive(Clone, Debug)]
pub struct Raw {
    pub expected: Option<String>,
    pub kind: &'static str,
    pub message: String,
    pub origin: Origin,
    pub subject: String,
    pub tag: String,
}

static TAG: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"helix-[a-z0-9]+(?:-[a-z0-9]+)*").expect("a literal pattern"));
static PARTS: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(helix-[a-z0-9-]+)((?:[^\s>+~,]*))::part\(\s*([^)]*?)\s*\)")
        .expect("a literal pattern")
});

/// Every `helix-*` type selector in a selector, in source order: never the
/// `helix-hero` of a class or an id.
pub fn targets(selector: &str) -> Vec<String> {
    let mut found: Vec<String> = Vec::new();
    for one in TAG.find_iter(selector) {
        let before = selector[..one.start()].chars().next_back();
        if before
            .is_some_and(|one| one.is_ascii_alphanumeric() || matches!(one, '_' | '.' | '#' | '-'))
        {
            continue;
        }
        let tag = one.as_str().to_owned();
        if !found.contains(&tag) {
            found.push(tag);
        }
    }
    found
}

/// Every `::part(a b)` in a selector, with the tag it hangs off.
pub fn parts(selector: &str) -> Vec<(String, Vec<String>)> {
    PARTS
        .captures_iter(selector)
        .filter_map(|found| {
            let names: Vec<String> = found[3].split_whitespace().map(str::to_owned).collect();
            (!names.is_empty()).then(|| (found[1].to_owned(), names))
        })
        .collect()
}

/// Names in backticks, as a sentence lists them: `a`, `a` or `b`, and `a`,
/// `b`, or `c`.
fn listed(names: &[&str], conjunction: &str) -> String {
    let quoted: Vec<String> = names.iter().map(|name| format!("`{name}`")).collect();
    match quoted.as_slice() {
        [] => String::new(),
        [one] => one.clone(),
        [one, two] => format!("{one} {conjunction} {two}"),
        [rest @ .., last] => format!("{}, {conjunction} {last}", rest.join(", ")),
    }
}

/// The findings, and the faults only the page can settle.
#[derive(Debug, Default)]
pub struct Found {
    pub findings: Vec<Raw>,
    pub unsettled: Vec<Raw>,
}

/// Judges a project's sheets and templates against the lint data.
pub struct Analyzer<'a> {
    index: &'a Index,
    /// The tags that list each hook.
    listing: &'a HashMap<String, Vec<String>>,
    /// Every custom property a `var()` reads anywhere in the project.
    used: &'a HashSet<String>,
    /// The closest hook to each name that is not one, asked once per name.
    suggested: HashMap<String, Option<String>>,
    pub found: Found,
}

impl<'a> Analyzer<'a> {
    pub fn new(
        index: &'a Index,
        listing: &'a HashMap<String, Vec<String>>,
        used: &'a HashSet<String>,
    ) -> Self {
        Self {
            index,
            listing,
            used,
            suggested: HashMap::new(),
            found: Found::default(),
        }
    }

    /// The findings in one sheet's rules. `own` is whether the sheet is a
    /// Helix element's own, whose private properties are the library's to
    /// account for, so its loose rules are not judged.
    pub fn sheet(&mut self, path: &str, rules: &[StyleRule], own: bool) {
        for rule in rules {
            let origin = || Origin {
                index: rule.index,
                line: rule.line,
                sheet: path.to_owned(),
                text: rule.text(),
            };
            if rule.selector.contains("helix-") {
                self.parts(rule, &origin);
            }
            let known: Vec<String> = targets(&rule.selector)
                .into_iter()
                .filter(|tag| self.index.get(tag).is_some())
                .collect();
            if known.is_empty() {
                if !own {
                    self.loose(rule, &origin);
                }
                continue;
            }
            self.hooks(rule, &known, &origin);
        }
    }

    /// A rule's parts: on a tag no package publishes, unpublished, or
    /// published by another tag and never forwarded.
    fn parts(&mut self, rule: &StyleRule, origin: &dyn Fn() -> Origin) {
        for (tag, names) in parts(&rule.selector) {
            let Some(element) = self.index.get(&tag) else {
                self.found.findings.push(Raw {
                    expected: None,
                    kind: "unknown-tag",
                    message: format!("`{tag}` is in no Helix package your project installs, so this rule matches nothing. Check the spelling, or install the package that publishes the tag."),
                    origin: origin(),
                    subject: tag.clone(),
                    tag,
                });
                continue;
            };
            for part in names {
                if element.has_part(&part) {
                    continue;
                }
                let elsewhere = self
                    .index
                    .tags
                    .iter()
                    .find(|(other, entry)| *other != tag && entry.has_part(&part));
                if let Some((other, _)) = elsewhere {
                    self.found.findings.push(Raw {
                        expected: Some(part.clone()),
                        kind: "unforwarded-part",
                        message: format!("`{tag}` does not publish `{part}`, though `{other}` does, so this rule matches nothing until the part is forwarded. The fix belongs in Helix."),
                        origin: origin(),
                        subject: format!("{tag}::part({part})"),
                        tag: tag.clone(),
                    });
                    continue;
                }
                let published: Vec<&str> = element
                    .parts
                    .iter()
                    .map(|(name, _)| name.as_str())
                    .collect();
                let suggestion = nearest(&part, published.iter().copied(), None);
                let mut sorted = published.clone();
                sorted.sort_unstable();
                self.found.findings.push(Raw {
                    expected: suggestion.map(str::to_owned),
                    kind: "dead-part",
                    message: match suggestion {
                        Some(suggestion) => format!("`{tag}` publishes no part named `{part}`. The closest part it publishes is `{suggestion}`."),
                        None if sorted.is_empty() => format!("`{tag}` publishes no part named `{part}`, so this rule matches nothing. It publishes no parts."),
                        None => format!("`{tag}` publishes no part named `{part}`, so this rule matches nothing. Its parts are {}.", listed(&sorted, "and")),
                    },
                    origin: origin(),
                    subject: format!("{tag}::part({part})"),
                    tag: tag.clone(),
                });
            }
        }
    }

    /// The hooks a rule naming Helix tags sets: wrong only where no tag it
    /// names has the hook. `helix-button, helix-link { --gap: 0 }` is correct
    /// where either has it.
    fn hooks(&mut self, rule: &StyleRule, known: &[String], origin: &dyn Fn() -> Origin) {
        for (property, _) in &rule.declarations {
            if !property.starts_with("--") {
                continue;
            }
            let elements: Vec<_> = known.iter().filter_map(|tag| self.index.get(tag)).collect();
            if elements.iter().any(|element| element.has_hook(property)) {
                continue;
            }
            /* **A name no Helix tag has is the project's own property**, set
            here for its own rules. Only a name Helix has somewhere, or one a
            letter or two from a hook the tag has, is evidence of a mistake. */
            let others: Vec<&str> = self
                .listing
                .get(property)
                .map(|tags| tags.iter().map(String::as_str).collect())
                .unwrap_or_default();
            let candidates = elements
                .iter()
                .flat_map(|element| element.hooks.iter().map(|(name, _)| name.as_str()));
            let suggestion = nearest(property, candidates, Some(HOOK_DISTANCE)).map(str::to_owned);
            if others.is_empty() && (suggestion.is_none() || self.used.contains(property)) {
                continue;
            }
            let tag = known[0].clone();
            let subject = format!("{} {{ {property} }}", rule.selector);
            if let Some(suggestion) = suggestion {
                self.found.findings.push(Raw {
                    message: format!("`{tag}` has no hook `{property}`. It has `{suggestion}`, two edits or fewer away, which is likely what you meant."),
                    expected: Some(suggestion),
                    kind: "dead-hook",
                    origin: origin(),
                    subject,
                    tag,
                });
                continue;
            }
            /* **Set on an ancestor of an element with the hook, this works**:
            a custom property inherits through a shadow boundary. Only the
            running page shows whether one is there. */
            let mut having = others.clone();
            having.sort_unstable();
            let named = if having.len() > 3 {
                format!(
                    "{}, and {} more",
                    having[..3]
                        .iter()
                        .map(|one| format!("`{one}`"))
                        .collect::<Vec<_>>()
                        .join(", "),
                    having.len() - 3
                )
            } else {
                listed(&having, "and")
            };
            self.found.unsettled.push(Raw {
                expected: None,
                kind: "dead-hook",
                message: format!(
                    "`{tag}` has no hook `{property}`. {named} {} it, so the rule works where {} inside `{tag}`, which only the running page shows.",
                    if having.len() == 1 { "has" } else { "have" },
                    if having.len() == 1 { "one is" } else { "one of them is" },
                ),
                origin: origin(),
                subject,
                tag,
            });
        }
    }

    /// The hooks a rule naming no Helix tag sets. The one fault the text
    /// proves is a misspelling: a name no Helix tag has, two edits or fewer
    /// from one that one does, and read by no `var()` in the project.
    fn loose(&mut self, rule: &StyleRule, origin: &dyn Fn() -> Origin) {
        for (property, _) in &rule.declarations {
            /* **Never a token, never private.** A `--helix-` token is read by
            every component, and a `--_` name is private by Helix's convention. */
            if !property.starts_with("--")
                || property.starts_with("--helix-")
                || property.starts_with("--_")
                || self.listing.contains_key(property)
                || self.used.contains(property)
            {
                continue;
            }
            let listing = self.listing;
            let suggestion = self
                .suggested
                .entry(property.clone())
                .or_insert_with(|| {
                    nearest(
                        property,
                        listing.keys().map(String::as_str),
                        Some(HOOK_DISTANCE),
                    )
                    .map(str::to_owned)
                })
                .clone();
            let Some(suggestion) = suggestion else {
                continue;
            };
            /* Named for the first tag listing the hook, by name, so the
            fingerprint does not move with which tags a project uses. */
            let tag = listing
                .get(&suggestion)
                .and_then(|tags| tags.iter().min())
                .cloned()
                .unwrap_or_default();
            self.found.findings.push(Raw {
                message: format!("`{}` sets `{property}`, which is no Helix hook and is read by no `var()` in your project. `{tag}` has the hook `{suggestion}`, two edits or fewer away, which is likely what you meant.", rule.selector),
                expected: Some(suggestion),
                kind: "dead-hook",
                origin: origin(),
                subject: format!("{} {{ {property} }}", rule.selector),
                tag,
            });
        }
    }

    /// The attributes on Helix elements that do nothing: a name the element
    /// does not take, and a value outside the ones a closed set allows. One
    /// finding per tag, attribute, and value, however many elements in
    /// however many files, with the first one's place.
    pub fn markup<'t>(&mut self, files: impl IntoIterator<Item = (&'t str, &'t [Element])>) {
        let mut grouped: BTreeMap<(usize, String), (Raw, usize)> = BTreeMap::new();
        let mut keys: HashMap<String, usize> = HashMap::new();
        for (path, elements) in files {
            for (position, element) in elements.iter().enumerate() {
                let Some(published) = self.index.get(&element.tag) else {
                    continue;
                };
                for attribute in &element.attributes {
                    let name = attribute.name.as_str();
                    if matches!(attribute.value, Value::Skip)
                        || GLOBAL.contains(&name)
                        || FRAMEWORK.contains(&name)
                        || PREFIXES.iter().any(|prefix| name.starts_with(prefix))
                        || published.written.contains(name)
                    {
                        continue;
                    }
                    let tag = element.tag.as_str();
                    let origin = || Origin {
                        index: position,
                        line: element.line,
                        sheet: path.to_owned(),
                        text: element.text.clone(),
                    };
                    let raw = match published.attribute(name) {
                        None => {
                            let suggestion = nearest(
                                name,
                                published.attributes.iter().map(|(one, _)| one.as_str()),
                                None,
                            );
                            Raw {
                                expected: suggestion.map(str::to_owned),
                                kind: "unknown-attribute",
                                message: match suggestion {
                                    Some(suggestion) => format!("`{tag}` takes no attribute `{name}`, so it does nothing. The closest it takes is `{suggestion}`."),
                                    None => format!("`{tag}` takes no attribute `{name}`, so it does nothing."),
                                },
                                origin: origin(),
                                subject: format!("<{tag} {name}>"),
                                tag: tag.to_owned(),
                            }
                        }
                        Some(Allows::OneOf(allows)) => match &attribute.value {
                            Value::Literal(value)
                                if !value.is_empty() && !allows.contains(value) =>
                            {
                                let allowed: Vec<&str> =
                                    allows.iter().map(String::as_str).collect();
                                let suggestion = nearest(value, allowed.iter().copied(), None);
                                Raw {
                                    expected: suggestion.map(str::to_owned),
                                    kind: "invalid-value",
                                    message: format!(
                                        "`{name}` on `{tag}` takes {}, so `{value}` falls back to the default.{}",
                                        listed(&allowed, "or"),
                                        suggestion.map_or(String::new(), |suggestion| format!(" The closest is `{suggestion}`.")),
                                    ),
                                    origin: origin(),
                                    subject: format!("<{tag} {name}=\"{value}\">"),
                                    tag: tag.to_owned(),
                                }
                            }
                            _ => continue,
                        },
                        Some(Allows::Any) => continue,
                    };
                    let key = format!("{} {}", raw.kind, raw.subject);
                    let order = keys.len();
                    let order = *keys.entry(key.clone()).or_insert(order);
                    grouped
                        .entry((order, key))
                        .and_modify(|(_, count)| *count += 1)
                        .or_insert((raw, 1));
                }
            }
        }
        for (mut raw, count) in grouped.into_values() {
            if count > 1 {
                raw.message = format!("{} On {count} elements.", raw.message);
            }
            self.found.findings.push(raw);
        }
    }
}

#[cfg(test)]
mod tests {
    use std::collections::HashSet;

    use super::{listed, parts, targets, Analyzer};
    use crate::scan::css;
    use crate::scan::lint::{Index, LintData};
    use crate::scan::markup;

    fn index() -> Index {
        Index::of(&[LintData {
            package: "@fusion.dev/helix".to_owned(),
            tags: serde_json::json!({
                "helix-card": { "attributes": { "tone": ["primary", "neutral"] }, "family": "card", "hooks": ["--card-padding"], "parts": ["body", "media"], "written": [] },
                "helix-copy-button": { "attributes": {}, "family": "copy-button", "hooks": [], "parts": [], "written": [] },
                "helix-icon-button": { "attributes": {}, "family": "icon-button", "hooks": ["--icon-button-size"], "parts": ["control"], "written": [] }
            })
            .as_object()
            .expect("an object")
            .clone(),
            version: None,
        }])
    }

    #[test]
    fn a_type_selector_is_a_target_and_a_class_is_not() {
        assert_eq!(
            targets(".helix-hero helix-card > helix-tag, #helix-x, helix-card"),
            ["helix-card", "helix-tag"]
        );
    }

    #[test]
    fn parts_are_read_with_their_tag() {
        assert_eq!(
            parts("helix-card:hover::part(body media), helix-tag::part( label )"),
            [
                (
                    "helix-card".to_owned(),
                    vec!["body".to_owned(), "media".to_owned()]
                ),
                ("helix-tag".to_owned(), vec!["label".to_owned()]),
            ]
        );
    }

    #[test]
    fn lists_take_the_serial_comma() {
        assert_eq!(listed(&["a"], "or"), "`a`");
        assert_eq!(listed(&["a", "b"], "or"), "`a` or `b`");
        assert_eq!(listed(&["a", "b", "c"], "and"), "`a`, `b`, and `c`");
    }

    #[test]
    fn what_the_text_proves_is_found_and_the_rest_is_unsettled() {
        let index = index();
        let listing = index.hooks();
        let used: HashSet<String> = HashSet::from(["--card-pad".to_owned()]);
        let mut analyzer = Analyzer::new(&index, &listing, &used);
        let rules = css::read(
            "helix-card::part(bdy) { color: red; }\nhelix-card { --card-paddin: 0; --mine: 1; }\nhelix-copy-button { --icon-button-size: 2rem; }\n.frame { --card-padin: 1rem; --card-pad: 2rem; }\nhelix-buton::part(x) { color: red; }\n",
            1,
            false,
        );
        analyzer.sheet("app.css", &rules, false);
        let found: Vec<(&str, &str, usize)> = analyzer
            .found
            .findings
            .iter()
            .map(|one| (one.kind, one.subject.as_str(), one.origin.line))
            .collect();
        assert_eq!(
            found,
            [
                ("dead-part", "helix-card::part(bdy)", 1),
                ("dead-hook", "helix-card { --card-paddin }", 2),
                ("dead-hook", ".frame { --card-padin }", 4),
                ("unknown-tag", "helix-buton", 5),
            ]
        );
        assert_eq!(analyzer.found.findings[0].expected.as_deref(), Some("body"));
        let unsettled = &analyzer.found.unsettled;
        assert_eq!(unsettled.len(), 1);
        assert_eq!(
            unsettled[0].subject,
            "helix-copy-button { --icon-button-size }"
        );
        assert_eq!(unsettled[0].message, "`helix-copy-button` has no hook `--icon-button-size`. `helix-icon-button` has it, so the rule works where one is inside `helix-copy-button`, which only the running page shows.");
    }

    #[test]
    fn attributes_are_judged_once_per_tag_name_and_value() {
        let index = index();
        let listing = index.hooks();
        let used = HashSet::new();
        let mut analyzer = Analyzer::new(&index, &listing, &used);
        let one = markup::read(
            "<helix-card tone=\"bold\" key=\"a\" data-x=\"1\"></helix-card>",
            1,
        );
        let two = markup::read("<helix-card tone=\"bold\" tonee></helix-card>", 3);
        analyzer.markup([
            ("a.html", one.elements.as_slice()),
            ("b.html", two.elements.as_slice()),
        ]);
        let found: Vec<(&str, &str)> = analyzer
            .found
            .findings
            .iter()
            .map(|one| (one.kind, one.message.as_str()))
            .collect();
        assert_eq!(
            found,
            [
                ("invalid-value", "`tone` on `helix-card` takes `primary` or `neutral`, so `bold` falls back to the default. On 2 elements."),
                ("unknown-attribute", "`helix-card` takes no attribute `tonee`, so it does nothing. The closest it takes is `tone`."),
            ]
        );
    }
}
