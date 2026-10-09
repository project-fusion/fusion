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

use std::collections::{BTreeMap, BTreeSet, HashMap, HashSet};
use std::sync::LazyLock;

use regex::Regex;

use super::css::StyleRule;
use super::identity::nearest;
use super::installed::Installed;
use super::lint::{Allows, Index, Published};
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

/// A Helix tag carrying an attribute selector, with the attribute's name.
static UNREFLECTED: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(helix-[a-z0-9-]+)(?:[.#:][\w-]+(?:\([^)]*\))?)*\[\s*([a-zA-Z][\w-]*)")
        .expect("a literal pattern")
});

/// A class carrying an attribute selector, with the attribute's name.
static CLASS_ATTRIBUTE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"\.([\w-]+)(?:[.#:][\w-]+(?:\([^)]*\))?)*\[\s*([a-zA-Z][\w-]*)")
        .expect("a literal pattern")
});

/// Attributes every element writes back, being reflected IDL attributes of
/// `HTMLElement`, so a selector on one matches however it was set.
const ALWAYS_WRITTEN: [&str; 11] = [
    "class", "dir", "hidden", "id", "lang", "part", "role", "slot", "style", "tabindex", "title",
];

/// A Helix tag carrying an attribute selector for `disabled`.
static DISABLED: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(helix-[a-z0-9-]+)\[\s*disabled\s*\]").expect("a literal pattern")
});

/// One finding per kind and subject, counted, in the order first seen.
fn keep(
    grouped: &mut BTreeMap<(usize, String), (Raw, usize)>,
    keys: &mut HashMap<String, usize>,
    raw: Raw,
) {
    let key = format!("{} {}", raw.kind, raw.subject);
    let order = keys.len();
    let order = *keys.entry(key.clone()).or_insert(order);
    grouped
        .entry((order, key))
        .and_modify(|(_, count)| *count += 1)
        .or_insert((raw, 1));
}

/// `BeforeChange` as `before-change`.
fn kebab(camel: &str) -> String {
    let mut out = String::new();
    for (index, letter) in camel.chars().enumerate() {
        if letter.is_ascii_uppercase() {
            if index > 0 {
                out.push('-');
            }
            out.push(letter.to_ascii_lowercase());
        } else {
            out.push(letter);
        }
    }
    out
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

/// A selector with its `:has()` and `:not()` taken out, so a tag inside one is
/// never read as the one a `::part` hangs off:
/// `helix-data-table:has(> helix-table-row)::part(toolbar)` is a data table's
/// toolbar. Counted to the closing parenthesis, since what they hold can hold
/// parentheses of its own.
fn bare(selector: &str) -> String {
    let mut out = String::with_capacity(selector.len());
    let mut rest = selector;
    while let Some(first) = rest.chars().next() {
        let held = [":has(", ":not("].iter().find(|one| rest.starts_with(*one));
        let Some(held) = held else {
            out.push(first);
            rest = &rest[first.len_utf8()..];
            continue;
        };
        let mut depth = 0_usize;
        let mut end = rest.len();
        for (at, one) in rest.char_indices().skip(held.len() - 1) {
            if one == '(' {
                depth += 1;
            } else if one == ')' {
                depth -= 1;
                if depth == 0 {
                    end = at + 1;
                    break;
                }
            }
        }
        rest = &rest[end..];
    }
    out
}

/// Every `::part(a b)` in a selector, with the tag it hangs off.
pub fn parts(selector: &str) -> Vec<(String, Vec<String>)> {
    PARTS
        .captures_iter(&bare(selector))
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
    /// Every part name the project's own templates write, `part="name"`.
    declared: HashSet<String>,
    /// The Helix tags each class is written on, read from the templates.
    classes: HashMap<String, BTreeSet<String>>,
    /// What the installed packages publish beyond their lint data, and the
    /// Helix specifiers the project imports, where the scan has them.
    installed: Option<(&'a Installed, &'a HashSet<String>)>,
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
            declared: HashSet::new(),
            classes: HashMap::new(),
            installed: None,
            found: Found::default(),
        }
    }

    /// The same analyzer, with the checks that read the installed packages'
    /// catalog and token set, and the project's imports.
    #[must_use]
    pub fn with(mut self, installed: &'a Installed, imports: &'a HashSet<String>) -> Self {
        self.installed = Some((installed, imports));
        self
    }

    /// The part names the project's own templates write, read before the
    /// sheets: a `::part()` naming one of them may be a part of the project's
    /// own, rendered inside a Helix element.
    pub fn declare<'t>(&mut self, files: impl IntoIterator<Item = &'t [Element]>) {
        for elements in files {
            for element in elements {
                for attribute in &element.attributes {
                    if let ("part", Value::Literal(value)) = (&attribute.name[..], &attribute.value)
                    {
                        self.declared
                            .extend(value.split_whitespace().map(str::to_owned));
                    }
                    if let ("class", Value::Literal(value)) =
                        (&attribute.name[..], &attribute.value)
                    {
                        if element.tag.starts_with("helix-") {
                            for class in value.split_whitespace() {
                                self.classes
                                    .entry(class.to_owned())
                                    .or_default()
                                    .insert(element.tag.clone());
                            }
                        }
                    }
                }
            }
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
            if !own {
                self.disabled(rule, &origin);
                self.tokens(rule, &origin);
                self.unreflected(rule, &origin);
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
                /* **A part the project writes itself is left to the page.** A
                template the project hands a Helix element, such as a Data
                Table's cell, renders inside the element's shadow root, and a
                `part` on it is reachable through `::part()` like the element's
                own. Only the running page shows whether it is there. */
                if self.declared.contains(&part) {
                    self.found.unsettled.push(Raw {
                        expected: None,
                        kind: "dead-part",
                        message: format!("`{tag}` publishes no part named `{part}`, and your templates write `part=\"{part}\"`. The rule works where one of them renders inside `{tag}`, as a Data Table's cell template does, which only the running page shows."),
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
            /* **A name in a tag's own prefix is the tag's**, so `--button-glow`
            on `helix-button` claims to be a hook Button does not have, and no
            project names its own property that way. */
            let claimed = known.iter().find(|tag| {
                tag.strip_prefix("helix-")
                    .is_some_and(|bare| property.starts_with(&format!("--{bare}-")))
            });
            if let Some(claimed) = claimed.filter(|_| {
                others.is_empty() && suggestion.is_none() && !self.used.contains(property)
            }) {
                let mut hooks: Vec<&str> = self
                    .index
                    .get(claimed)
                    .map(|element| {
                        element
                            .hooks
                            .iter()
                            .map(|(name, _)| name.as_str())
                            .collect()
                    })
                    .unwrap_or_default();
                hooks.sort_unstable();
                self.found.findings.push(Raw {
                    expected: None,
                    kind: "dead-hook",
                    message: if hooks.is_empty() {
                        format!("`{claimed}` has no hook `{property}`, so nothing reads it. It has no hooks.")
                    } else {
                        format!("`{claimed}` has no hook `{property}`, so nothing reads it. Its hooks are {}.", listed(&hooks, "and"))
                    },
                    origin: origin(),
                    subject: format!("{} {{ {property} }}", rule.selector),
                    tag: claimed.clone(),
                });
                continue;
            }
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
                if let Some(raw) = self.slot(path, position, element, elements) {
                    keep(&mut grouped, &mut keys, raw);
                }
                let mut also = Vec::new();
                if self.index.get(&element.tag).is_some() {
                    also.extend(self.unimported(path, position, element));
                    if std::path::Path::new(path).extension().is_some_and(|ext| {
                        ext.eq_ignore_ascii_case("tsx") || ext.eq_ignore_ascii_case("jsx")
                    }) {
                        also.extend(self.events(path, position, element));
                    }
                }
                for raw in also {
                    keep(&mut grouped, &mut keys, raw);
                }
                let Some(published) = self.index.get(&element.tag) else {
                    if let Some(raw) = self.unknown_tag(path, position, element) {
                        keep(&mut grouped, &mut keys, raw);
                    }
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
                        None => unknown_attribute(tag, name, published, origin()),
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
                    keep(&mut grouped, &mut keys, raw);
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

    /// A rule styling a form control's `[disabled]`, which a control a
    /// `<fieldset disabled>` disables never carries.
    fn disabled(&mut self, rule: &StyleRule, origin: &dyn Fn() -> Origin) {
        let Some((installed, _)) = self.installed else {
            return;
        };
        for found in DISABLED.captures_iter(&rule.selector) {
            let tag = found.get(1).map_or("", |one| one.as_str());
            if !installed.forms.contains(tag) {
                continue;
            }
            self.found.findings.push(Raw {
                expected: Some(format!("{tag}:disabled")),
                kind: "disabled-attribute",
                message: format!("`{tag}[disabled]` misses a `{tag}` that a `<fieldset disabled>` disables, which sets no attribute, so it looks enabled and takes no input. Write `{tag}:disabled`."),
                origin: origin(),
                subject: format!("{tag}[disabled]"),
                tag: tag.to_owned(),
            });
        }
    }

    /// A listener added by name for a `helix-` event no Helix element
    /// dispatches, which never runs. The element it is added to is not known
    /// from the text, so a name some element sends is left alone.
    pub fn listened(&mut self, listened: &[(String, usize, String)]) {
        let Some((installed, _)) = self.installed else {
            return;
        };
        if installed.dispatched.is_empty() {
            return;
        }
        let mut seen = HashSet::new();
        for (path, line, name) in listened {
            if installed.dispatched.contains(name) || !seen.insert(name.clone()) {
                continue;
            }
            let close = nearest(name, installed.dispatched.iter().map(String::as_str), None)
                .map(str::to_owned);
            self.found.findings.push(Raw {
                message: match &close {
                    Some(close) => format!("A listener waits for `{name}`, which no Helix element dispatches, so it never runs. The closest event is `{close}`."),
                    None => format!("A listener waits for `{name}`, which no Helix element dispatches, so it never runs."),
                },
                expected: close,
                kind: "unknown-event",
                origin: Origin {
                    index: 0,
                    line: *line,
                    sheet: path.clone(),
                    text: format!("addEventListener('{name}')"),
                },
                subject: format!("addEventListener('{name}')"),
                tag: String::new(),
            });
        }
    }

    /// A rule selecting a Helix tag by an attribute it takes and never writes
    /// back, which matches only markup a server wrote: on a client navigation
    /// a framework sets the property, and the attribute is never there. The
    /// page diagnostics judge a class selector too, from the elements it
    /// reaches; the text names the tag, so this judges a tag-qualified one.
    fn unreflected(&mut self, rule: &StyleRule, origin: &dyn Fn() -> Origin) {
        let mut seen = HashSet::new();
        /* A tag named in the selector, and the Helix tags a class in it is
        written on in the templates. */
        let mut reached: Vec<(String, String)> = UNREFLECTED
            .captures_iter(&rule.selector)
            .map(|found| (found[1].to_owned(), found[2].to_owned()))
            .collect();
        for found in CLASS_ATTRIBUTE.captures_iter(&rule.selector) {
            for tag in self.classes.get(&found[1]).into_iter().flatten() {
                reached.push((tag.clone(), found[2].to_owned()));
            }
        }
        for (tag, attribute) in &reached {
            let (tag, attribute) = (tag.as_str(), attribute.as_str());
            if ALWAYS_WRITTEN.contains(&attribute)
                || attribute.starts_with("aria-")
                || attribute.starts_with("data-")
                || !seen.insert((tag.to_owned(), attribute.to_owned()))
            {
                continue;
            }
            let Some(published) = self.index.get(tag) else {
                continue;
            };
            let Some(reflected) = &published.reflected else {
                continue;
            };
            if reflected.contains(attribute)
                || published.written.contains(attribute)
                || published.attribute(attribute).is_none()
            {
                continue;
            }
            self.found.findings.push(Raw {
                expected: None,
                kind: "unreflected-attribute",
                message: format!("`{}` selects `{tag}` by `{attribute}`, which the element takes and never writes back to itself, so the rule matches only markup a server wrote: after a client navigation the property is set and the attribute is absent. Select a class or an attribute the element reflects, or set `{attribute}` as an attribute.", rule.selector),
                origin: origin(),
                subject: format!("{} [{attribute}]", rule.selector),
                tag: tag.to_owned(),
            });
        }
    }

    /// The tokens a rule reads and sets: a `--_helix-` primitive read, and a
    /// `--helix-` name the installed token set does not have.
    fn tokens(&mut self, rule: &StyleRule, origin: &dyn Fn() -> Origin) {
        let tag = targets(&rule.selector)
            .into_iter()
            .next()
            .unwrap_or_default();
        for (property, value) in &rule.declarations {
            for read in super::css::reads(value) {
                if read.starts_with("--_helix-") {
                    self.found.findings.push(Raw {
                        expected: None,
                        kind: "primitive-token",
                        message: format!("`{read}` is a primitive, internal to `@fusion.dev/helix-styles`, and it can be renamed in any release. Read the semantic token that refers to it, such as a `--helix-color-` token."),
                        origin: origin(),
                        subject: format!("{} {{ {property}: var({read}) }}", rule.selector),
                        tag: tag.clone(),
                    });
                } else if let Some(raw) =
                    self.unknown_token(read, "reads", rule, property, &tag, origin)
                {
                    self.found.findings.push(raw);
                }
            }
            if let Some(raw) = self.unknown_token(property, "sets", rule, property, &tag, origin) {
                self.found.findings.push(raw);
            }
        }
    }

    /// A `--helix-` name the token set does not have, read or set. The seeds
    /// are inputs to the token set and are not in it.
    fn unknown_token(
        &self,
        name: &str,
        verb: &str,
        rule: &StyleRule,
        property: &str,
        tag: &str,
        origin: &dyn Fn() -> Origin,
    ) -> Option<Raw> {
        let (installed, _) = self.installed?;
        let tokens = installed.tokens.as_ref()?;
        if !name.starts_with("--helix-")
            || name.starts_with("--helix-seed-")
            || name == "--helix-density"
            || tokens.contains(name)
        {
            return None;
        }
        let suggestion = nearest(name, tokens.iter().map(String::as_str), None).map(str::to_owned);
        Some(Raw {
            message: match &suggestion {
                Some(close) => format!("This rule {verb} `{name}`, which is not a Helix token, so it falls back silently. The closest token is `{close}`."),
                None => format!("This rule {verb} `{name}`, which is not a Helix token, so it falls back silently. `helix api tokens` lists the tokens."),
            },
            expected: suggestion,
            kind: "unknown-token",
            origin: origin(),
            subject: format!("{} {{ {property} }} {name}", rule.selector),
            tag: tag.to_owned(),
        })
    }

    /// An element written where nothing in the project imports the entry that
    /// registers it.
    fn unimported(&self, path: &str, position: usize, element: &Element) -> Option<Raw> {
        let (installed, imports) = self.installed?;
        if installed.imported(&element.tag, imports)? {
            return None;
        }
        let specifier = installed.specifiers.get(&element.tag)?;
        let tag = element.tag.as_str();
        Some(Raw {
            expected: Some(format!("import '{specifier}'")),
            kind: "unimported-tag",
            message: format!("`{tag}` is written here, and nothing in the project imports `{specifier}`, which registers it, so the browser draws an unknown element. Add `import '{specifier}'`."),
            origin: Origin {
                index: position,
                line: element.line,
                sheet: path.to_owned(),
                text: element.text.clone(),
            },
            subject: format!("<{tag}>"),
            tag: tag.to_owned(),
        })
    }

    /// The React `on` props on an element that bind nothing: a name in Helix's
    /// camel case, which React reads as an event of that exact name, and a
    /// hyphenated name the element does not dispatch.
    fn events(&self, path: &str, position: usize, element: &Element) -> Vec<Raw> {
        let Some((installed, _)) = self.installed else {
            return Vec::new();
        };
        let tag = element.tag.as_str();
        let mine = installed.events.get(tag).cloned().unwrap_or_default();
        let mut found = Vec::new();
        for attribute in &element.attributes {
            let name = attribute.name.as_str();
            let event = if let Some(rest) = name.strip_prefix("onHelix") {
                format!("helix-{}", kebab(rest))
            } else if name.starts_with("on") && name.contains('-') && !name.starts_with("on:") {
                name[2..].to_owned()
            } else {
                continue;
            };
            if mine.iter().any(|(_, prop)| prop == name) {
                continue;
            }
            let props: Vec<&str> = mine.iter().map(|(_, prop)| prop.as_str()).collect();
            let close = mine
                .iter()
                .find(|(dispatched, _)| *dispatched == event)
                .map(|(_, prop)| prop.clone())
                .or_else(|| nearest(name, props.iter().copied(), None).map(str::to_owned));
            let message = if installed.dispatched.contains(&event)
                && !mine.iter().any(|(one, _)| *one == event)
            {
                format!("`{tag}` does not dispatch `{event}`, so `{name}` never runs. React wires an `on` prop only on the element that dispatches the event.")
            } else {
                match &close {
                    Some(close) => format!("`{name}` on `{tag}` listens for an event named `{}`, and nothing dispatches it. Write `{close}`.", name.strip_prefix("on").unwrap_or(name)),
                    None if props.is_empty() => format!("`{name}` on `{tag}` listens for an event named `{}`, and nothing dispatches it. `{tag}` dispatches no events of its own.", name.strip_prefix("on").unwrap_or(name)),
                    None => format!("`{name}` on `{tag}` listens for an event named `{}`, and nothing dispatches it. `{tag}` takes {}.", name.strip_prefix("on").unwrap_or(name), listed(&props, "and")),
                }
            };
            found.push(Raw {
                expected: close,
                kind: "unknown-event",
                message,
                origin: Origin {
                    index: position,
                    line: element.line,
                    sheet: path.to_owned(),
                    text: element.text.clone(),
                },
                subject: format!("<{tag} {name}>"),
                tag: tag.to_owned(),
            });
        }
        found
    }

    /// A `helix-` element no installed package publishes, which the browser
    /// draws as an unknown inline element with nothing in it working.
    ///
    /// **The prefix is the claim.** A tag that starts with `helix-` says it is
    /// a Helix element, so one that no package lists is a misspelling, an
    /// invented component, or a package that is not installed. A project that
    /// names elements of its own this way turns the kind off for those tags in
    /// `helix-diagnostics.json`.
    fn unknown_tag(&self, path: &str, position: usize, element: &Element) -> Option<Raw> {
        let tag = element.tag.as_str();
        if !tag.starts_with("helix-") || tag == super::usage::OVERLAY {
            return None;
        }
        /* Measured without the shared prefix, which would otherwise count
        toward the third of a name a suggestion may be from it and offer
        `helix-drilldown` for `helix-dropdown`. */
        let suggestion = nearest(
            &tag["helix-".len()..],
            self.index
                .tags
                .iter()
                .filter_map(|(name, _)| name.strip_prefix("helix-")),
            None,
        )
        .map(|bare| format!("helix-{bare}"));
        Some(Raw {
            expected: suggestion.clone(),
            kind: "unknown-tag",
            message: match suggestion {
                Some(suggestion) => format!("`{tag}` is in no Helix package your project installs, so the browser draws it as an unknown element. The closest tag is `{suggestion}`."),
                None => format!("`{tag}` is in no Helix package your project installs, so the browser draws it as an unknown element. Check the spelling, or install the package that publishes the tag."),
            },
            origin: Origin {
                index: position,
                line: element.line,
                sheet: path.to_owned(),
                text: element.text.clone(),
            },
            subject: format!("<{tag}>"),
            tag: tag.to_owned(),
        })
    }

    /// A child naming a slot its Helix parent does not have, which the
    /// browser assigns to nothing and so never draws.
    ///
    /// **Judged only where the parent is a Helix element and its lint data
    /// lists slots.** A child of a component is the component's to place, and
    /// lint data from before slots were listed says nothing either way.
    fn slot(
        &self,
        path: &str,
        position: usize,
        element: &Element,
        elements: &[Element],
    ) -> Option<Raw> {
        let name = element.attributes.iter().find_map(|attribute| {
            match (&attribute.name[..], &attribute.value) {
                ("slot", Value::Literal(value)) if !value.is_empty() => Some(value.as_str()),
                _ => None,
            }
        })?;
        let parent = elements.get(element.parent?)?;
        let slots = self.index.get(&parent.tag)?.slots.as_ref()?;
        if slots.contains(name) {
            return None;
        }
        let tag = parent.tag.as_str();
        let named: Vec<&str> = slots
            .iter()
            .map(String::as_str)
            .filter(|one| !one.is_empty())
            .collect();
        let suggestion = nearest(name, named.iter().copied(), None);
        Some(Raw {
            expected: suggestion.map(str::to_owned),
            kind: "unknown-slot",
            message: match suggestion {
                Some(suggestion) => format!("`{tag}` has no slot `{name}`, so this element is assigned nowhere and is not drawn. The closest slot it has is `{suggestion}`."),
                None if named.is_empty() => format!("`{tag}` has no slot `{name}`, so this element is assigned nowhere and is not drawn. It has only its default slot."),
                None => format!("`{tag}` has no slot `{name}`, so this element is assigned nowhere and is not drawn. Its slots are {}.", listed(&named, "and")),
            },
            origin: Origin {
                index: position,
                line: element.line,
                sheet: path.to_owned(),
                text: element.text.clone(),
            },
            subject: format!("<{tag}> [slot=\"{name}\"]"),
            tag: tag.to_owned(),
        })
    }
}

/// An attribute a tag does not take, with the closest name it does take or,
/// where nothing is close, the names that grew out of it.
fn unknown_attribute(tag: &str, name: &str, published: &Published, origin: Origin) -> Raw {
    let suggestion = nearest(
        name,
        published.attributes.iter().map(|(one, _)| one.as_str()),
        None,
    );
    /* **A name that grew is a rename.** `align` became `align-items` on Flex
    and `text-align` on a table column, too far for an edit distance and exactly
    what an upgrade leaves behind, so the attributes that start or end with the
    old name are named where nothing is close. */
    let grown: Vec<&str> = published
        .attributes
        .iter()
        .map(|(one, _)| one.as_str())
        .filter(|one| one.starts_with(&format!("{name}-")) || one.ends_with(&format!("-{name}")))
        .collect();
    Raw {
        expected: suggestion
            .or(match grown.as_slice() {
                [one] => Some(*one),
                _ => None,
            })
            .map(str::to_owned),
        kind: "unknown-attribute",
        message: match suggestion {
            Some(suggestion) => format!("`{tag}` takes no attribute `{name}`, so it does nothing. The closest it takes is `{suggestion}`."),
            None if !grown.is_empty() => format!("`{tag}` takes no attribute `{name}`, so it does nothing. It takes {}, which may be what `{name}` became.", listed(&grown, "and")),
            None => format!("`{tag}` takes no attribute `{name}`, so it does nothing."),
        },
        origin,
        subject: format!("<{tag} {name}>"),
        tag: tag.to_owned(),
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
                "helix-card": { "attributes": { "tone": ["primary", "neutral"] }, "family": "card", "hooks": ["--card-padding"], "parts": ["body", "media"], "slots": ["", "header", "footer"], "written": [] },
                "helix-flex": { "attributes": { "align-content": null, "align-items": null, "gap": null }, "family": "flex", "hooks": [], "parts": [], "written": [] },
                "helix-copy-button": { "attributes": {}, "family": "copy-button", "hooks": [], "parts": [], "written": [] },
                "helix-icon-button": { "attributes": {}, "family": "icon-button", "hooks": ["--icon-button-size"], "parts": ["control"], "written": [] }
            })
            .as_object()
            .expect("an object")
            .clone(),
            version: None,
        }])
    }

    /// What the installed packages add, for the checks that read it: Card is
    /// a form control here so `[disabled]` has something to judge.
    fn installed() -> super::super::installed::Installed {
        let mut installed = super::super::installed::Installed {
            tokens: Some(
                ["--helix-color-surface", "--helix-space-md"]
                    .map(str::to_owned)
                    .into(),
            ),
            ..Default::default()
        };
        installed
            .specifiers
            .insert("helix-card".to_owned(), "@fusion.dev/helix/card".to_owned());
        installed
            .specifiers
            .insert("helix-flex".to_owned(), "@fusion.dev/helix/flex".to_owned());
        installed.events.insert(
            "helix-card".to_owned(),
            vec![("helix-select".to_owned(), "onhelix-select".to_owned())],
        );
        installed.dispatched.insert("helix-select".to_owned());
        installed.dispatched.insert("helix-dismiss".to_owned());
        installed.forms.insert("helix-card".to_owned());
        installed
    }

    fn kinds(analyzer: &Analyzer<'_>) -> Vec<(&'static str, String)> {
        analyzer
            .found
            .findings
            .iter()
            .map(|one| (one.kind, one.subject.clone()))
            .collect()
    }

    #[test]
    fn rules_reading_primitives_and_names_outside_the_token_set_are_found() {
        let index = index();
        let listing = index.hooks();
        let used = HashSet::new();
        let installed = installed();
        let imports = HashSet::new();
        let mut analyzer = Analyzer::new(&index, &listing, &used).with(&installed, &imports);
        let rules = crate::scan::css::read(
            ".a { color: var(--_helix-neutral-500); padding: var(--helix-space-md); }\n.b { --helix-color-surfce: red; --helix-seed-brand: red; }\nhelix-card[disabled], helix-flex[disabled] { opacity: .5 }",
            1,
            false,
        );
        analyzer.sheet("a.css", &rules, false);
        assert_eq!(
            kinds(&analyzer),
            [
                (
                    "primitive-token",
                    ".a { color: var(--_helix-neutral-500) }".to_owned()
                ),
                (
                    "unknown-token",
                    ".b { --helix-color-surfce } --helix-color-surfce".to_owned()
                ),
                ("disabled-attribute", "helix-card[disabled]".to_owned()),
            ]
        );
    }

    #[test]
    fn a_tag_selected_by_an_attribute_it_never_writes_back_is_found() {
        let index = Index::of(&[LintData {
            package: "@fusion.dev/helix".to_owned(),
            tags: serde_json::json!({
                "helix-slider": { "attributes": { "label": null, "required": null }, "family": "slider", "hooks": [], "parts": [], "reflected": ["required"], "written": [] },
                "helix-card": { "attributes": { "label": null }, "family": "card", "hooks": [], "parts": [], "written": [] }
            })
            .as_object()
            .expect("an object")
            .clone(),
            version: None,
        }]);
        let listing = index.hooks();
        let used = HashSet::new();
        let mut analyzer = Analyzer::new(&index, &listing, &used);
        let rules = crate::scan::css::read(
            "helix-slider.channel[label=\"Saturation\"], helix-slider[required], helix-slider[data-x], helix-card[label] { color: red }",
            1,
            false,
        );
        analyzer.sheet("a.css", &rules, false);
        /* Card's lint data says nothing of reflection, so it is not judged. */
        assert_eq!(
            kinds(&analyzer),
            [(
                "unreflected-attribute",
                "helix-slider.channel[label=\"Saturation\"], helix-slider[required], helix-slider[data-x], helix-card[label] [label]".to_owned()
            )]
        );
    }

    #[test]
    fn a_class_selector_reaching_a_helix_element_by_an_unreflected_attribute_is_found() {
        let index = Index::of(&[LintData {
            package: "@fusion.dev/helix".to_owned(),
            tags: serde_json::json!({
                "helix-slider": { "attributes": { "label": null }, "family": "slider", "hooks": [], "parts": [], "reflected": [], "written": [] }
            })
            .as_object()
            .expect("an object")
            .clone(),
            version: None,
        }]);
        let listing = index.hooks();
        let used = HashSet::new();
        let mut analyzer = Analyzer::new(&index, &listing, &used);
        let page = crate::scan::jsx::read(
            "export const A = () => <helix-slider className={styles.channel} label=\"Saturation\" />",
            oxc_span::SourceType::tsx(),
        )
        .expect("JSX");
        analyzer.declare([page.elements.as_slice()]);
        let rules = crate::scan::css::read(
            ".channel[label=\"Saturation\"] { color: red } .other[label] { color: red }",
            1,
            false,
        );
        analyzer.sheet("a.module.css", &rules, false);
        assert_eq!(
            kinds(&analyzer),
            [(
                "unreflected-attribute",
                ".channel[label=\"Saturation\"] [label]".to_owned()
            )]
        );
    }

    #[test]
    fn a_name_in_a_tag_s_own_prefix_that_is_no_hook_is_found() {
        let index = index();
        let listing = index.hooks();
        let used = HashSet::new();
        let mut analyzer = Analyzer::new(&index, &listing, &used);
        let rules =
            crate::scan::css::read("helix-card { --card-glow: 1px; --my-own: 2px; }", 1, false);
        analyzer.sheet("a.css", &rules, false);
        assert_eq!(
            kinds(&analyzer),
            [("dead-hook", "helix-card { --card-glow }".to_owned())]
        );
    }

    #[test]
    fn an_element_whose_entry_nothing_imports_is_found_and_a_barrel_covers_all() {
        let index = index();
        let listing = index.hooks();
        let used = HashSet::new();
        let installed = installed();
        let page = markup::read("<helix-card></helix-card><helix-flex></helix-flex>", 1);
        let imports: HashSet<String> = ["@fusion.dev/helix/flex".to_owned()].into();
        let mut analyzer = Analyzer::new(&index, &listing, &used).with(&installed, &imports);
        analyzer.markup([("a.html", page.elements.as_slice())]);
        assert_eq!(
            kinds(&analyzer),
            [("unimported-tag", "<helix-card>".to_owned())]
        );

        let barrel: HashSet<String> = ["@fusion.dev/helix".to_owned()].into();
        let mut analyzer = Analyzer::new(&index, &listing, &used).with(&installed, &barrel);
        analyzer.markup([("a.html", page.elements.as_slice())]);
        assert!(kinds(&analyzer).is_empty());
    }

    #[test]
    fn a_listener_for_a_helix_event_nothing_dispatches_is_found() {
        let index = index();
        let listing = index.hooks();
        let used = HashSet::new();
        let installed = installed();
        let imports = HashSet::new();
        let mut analyzer = Analyzer::new(&index, &listing, &used).with(&installed, &imports);
        analyzer.listened(&[
            ("a.ts".to_owned(), 3, "helix-selcet".to_owned()),
            ("a.ts".to_owned(), 4, "helix-select".to_owned()),
            ("b.ts".to_owned(), 9, "helix-selcet".to_owned()),
        ]);
        assert_eq!(
            kinds(&analyzer),
            [(
                "unknown-event",
                "addEventListener('helix-selcet')".to_owned()
            )]
        );
        assert_eq!(
            analyzer.found.findings[0].expected.as_deref(),
            Some("helix-select")
        );
    }

    #[test]
    fn a_react_prop_naming_no_event_the_element_dispatches_is_found() {
        let index = index();
        let listing = index.hooks();
        let used = HashSet::new();
        let installed = installed();
        let imports: HashSet<String> = ["@fusion.dev/helix".to_owned()].into();
        let page = crate::scan::jsx::read(
            "export const A = () => <helix-card onhelix-select={f} onHelixSelect={f} onhelix-dismiss={f} onClick={f} onhelix-selcet={f} />",
            oxc_span::SourceType::tsx(),
        )
        .expect("JSX");
        let mut analyzer = Analyzer::new(&index, &listing, &used).with(&installed, &imports);
        analyzer.markup([("a.tsx", page.elements.as_slice())]);
        assert_eq!(
            kinds(&analyzer),
            [
                ("unknown-event", "<helix-card onHelixSelect>".to_owned()),
                ("unknown-event", "<helix-card onhelix-dismiss>".to_owned()),
                ("unknown-event", "<helix-card onhelix-selcet>".to_owned()),
            ]
        );
        /* The same props in HTML are not React's, and are not judged. */
        let mut analyzer = Analyzer::new(&index, &listing, &used).with(&installed, &imports);
        analyzer.markup([("a.html", page.elements.as_slice())]);
        assert!(kinds(&analyzer).is_empty());
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
    fn a_part_hangs_off_the_tag_outside_a_pseudo_class() {
        assert_eq!(
            parts("helix-data-table:not(:defined):has(> helix-table-row)::part(toolbar)"),
            [("helix-data-table".to_owned(), vec!["toolbar".to_owned()])]
        );
        assert_eq!(
            parts(
                "helix-data-table:has(> helix-table-column:nth-of-type(2)) > helix-table-column::part(column)"
            ),
            [("helix-table-column".to_owned(), vec!["column".to_owned()])]
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
    fn a_helix_tag_no_package_publishes_is_found_with_the_closest_tag() {
        let index = index();
        let listing = index.hooks();
        let used = HashSet::new();
        let mut analyzer = Analyzer::new(&index, &listing, &used);
        let page = markup::read(
            "<helix-cardd></helix-cardd><helix-dropdown></helix-dropdown><helix-dropdown></helix-dropdown><helix-diagnostics-overlay></helix-diagnostics-overlay><acme-card></acme-card>",
            1,
        );
        analyzer.markup([("a.html", page.elements.as_slice())]);
        let found: Vec<(&str, &str)> = analyzer
            .found
            .findings
            .iter()
            .map(|one| (one.kind, one.message.as_str()))
            .collect();
        assert_eq!(
            found,
            [
                ("unknown-tag", "`helix-cardd` is in no Helix package your project installs, so the browser draws it as an unknown element. The closest tag is `helix-card`."),
                ("unknown-tag", "`helix-dropdown` is in no Helix package your project installs, so the browser draws it as an unknown element. Check the spelling, or install the package that publishes the tag. On 2 elements."),
            ]
        );
    }

    #[test]
    fn a_slot_the_parent_lacks_is_found_and_one_it_has_is_not() {
        let index = index();
        let listing = index.hooks();
        let used = HashSet::new();
        let mut analyzer = Analyzer::new(&index, &listing, &used);
        let page = markup::read(
            "<helix-card><span slot=\"title\">A</span><span slot=\"header\">B</span><b slot=\"headr\">C</b></helix-card><helix-flex><i slot=\"x\"></i></helix-flex>",
            1,
        );
        analyzer.markup([("a.html", page.elements.as_slice())]);
        let found: Vec<(&str, &str)> = analyzer
            .found
            .findings
            .iter()
            .map(|one| (one.kind, one.message.as_str()))
            .collect();
        assert_eq!(
            found,
            [
                ("unknown-slot", "`helix-card` has no slot `title`, so this element is assigned nowhere and is not drawn. Its slots are `footer` and `header`."),
                ("unknown-slot", "`helix-card` has no slot `headr`, so this element is assigned nowhere and is not drawn. The closest slot it has is `header`."),
            ]
        );
    }

    #[test]
    fn a_part_the_project_writes_is_left_to_the_page() {
        let index = index();
        let listing = index.hooks();
        let used = HashSet::new();
        let mut analyzer = Analyzer::new(&index, &listing, &used);
        let cells = markup::read("<a part=\"business link\" href=\"/\">A</a>", 1);
        analyzer.declare([cells.elements.as_slice()]);
        let rules = css::read("helix-card::part(business) { color: red; }\n", 1, false);
        analyzer.sheet("app.css", &rules, false);
        assert!(analyzer.found.findings.is_empty());
        assert_eq!(analyzer.found.unsettled.len(), 1);
        assert_eq!(analyzer.found.unsettled[0].kind, "dead-part");
    }

    #[test]
    fn an_attribute_that_grew_names_what_it_became() {
        let index = index();
        let listing = index.hooks();
        let used = HashSet::new();
        let mut analyzer = Analyzer::new(&index, &listing, &used);
        let page = markup::read("<helix-flex align=\"center\"></helix-flex>", 1);
        analyzer.markup([("a.html", page.elements.as_slice())]);
        assert_eq!(
            analyzer.found.findings[0].message,
            "`helix-flex` takes no attribute `align`, so it does nothing. It takes `align-content` and `align-items`, which may be what `align` became."
        );
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
