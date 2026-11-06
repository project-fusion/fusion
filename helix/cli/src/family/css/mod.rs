//! The web output: a family's table, written as the stylesheet a browser reads.
//!
//! **The compiler's tests compare a stylesheet as it ships.** `build-styles`
//! strips the comments and the indentation from every component stylesheet
//! and joins its lines before the CSS reaches a page, so two stylesheets that
//! differ only in prose and layout ship as the same bytes. `shipped` is that
//! transformation, ported from `fusion/scripts/build-styles.mjs`,
//! `join-lines.mjs` and `tighten.mjs`, and the tests read what a table
//! compiles to in that form.

mod selector;
#[cfg(test)]
mod shipped;
mod value;

use std::collections::{BTreeMap, BTreeSet};
use std::fmt::Write as _;

use crate::family::api::{exported, Attribute, Node};
use crate::family::ir::{Condition, Family, Item, Rule};
use selector::selector;
use value::{render, Scope};

#[cfg(test)]
pub use shipped::shipped;

/// Whether a selector names a pseudo-element of one engine's alone, as
/// `::-webkit-slider-thumb` and `::-moz-range-thumb` are. **A selector list
/// holding one another engine does not know is dropped whole**, so such a
/// rule is never joined to its neighbors in a list.
fn vendored(selector: &str) -> bool {
    selector.contains("::-")
}

/// The stylesheet a family compiles to.
pub fn emit(family: &Family) -> String {
    let mut tokens = BTreeSet::new();
    shared(&family.tree, &mut tokens);
    let drawn = exported(&family.tree);
    /* **Rules side by side with the same declarations are one rule under a
    selector list**, as a sheet written by hand has it: a `when` of several
    alternatives is several rules in the intermediate form, each ranked on its
    own, and one rule on the web. */
    let mut pieces: Vec<Piece> = Vec::new();
    for item in &family.rules {
        match item {
            Item::Rule(rule) if rule.native_only => {}
            Item::Rule(rule) => {
                let rule = through_part(rule, &drawn);
                let written = written(&rule, Scope::of(family), &tokens);
                match pieces.last_mut() {
                    Some(Piece::Rule(held))
                        if held.wrappers == written.wrappers
                            && held.body == written.body
                            && !held.selectors.iter().any(|one| vendored(one))
                            && !vendored(&written.selectors[0]) =>
                    {
                        held.selectors.push(written.selectors[0].clone());
                    }
                    _ => pieces.push(Piece::Rule(written)),
                }
            }
            Item::Keyframes(keyframes) => {
                let mut css = format!("@keyframes {} {{\n", keyframes.name);
                for (at, declarations) in &keyframes.frames {
                    let _ = writeln!(css, "  {at} {{");
                    for (property, value) in declarations {
                        let _ =
                            writeln!(css, "    {property}: {};", render(value, Scope::of(family)));
                    }
                    css.push_str("  }\n");
                }
                css.push_str("}\n");
                pieces.push(Piece::Text(css));
            }
        }
    }
    /* **Rules side by side under the same at-rules share one block of it**,
    as a sheet written by hand keeps a family's forced colors in one
    `@media (forced-colors: active)`. */
    let mut css = String::new();
    let mut at = 0;
    while at < pieces.len() {
        let mut run = 1;
        if let Piece::Rule(first) = &pieces[at] {
            while !first.wrappers.is_empty()
                && matches!(pieces.get(at + run), Some(Piece::Rule(next)) if next.wrappers == first.wrappers)
            {
                run += 1;
            }
        }
        if !css.is_empty() {
            css.push('\n');
        }
        let written: Vec<&Written> = pieces[at..at + run]
            .iter()
            .filter_map(|piece| match piece {
                Piece::Rule(written) => Some(written),
                Piece::Text(_) => None,
            })
            .collect();
        match &pieces[at] {
            Piece::Text(text) => css.push_str(text),
            Piece::Rule(_) => css.push_str(&Written::block(&written)),
        }
        at += run;
    }
    css
}

/// What the stylesheet holds, in order: a rule, or an animation as it is written.
enum Piece {
    Rule(Written),
    Text(String),
}

/// A rule as CSS, before rules alike are merged: the at-rules around it, its
/// selectors, and its declarations.
struct Written {
    body: Vec<String>,
    selectors: Vec<String>,
    wrappers: Vec<String>,
}

impl Written {
    /// Rules that share their at-rules, inside one block of each.
    fn block(rules: &[&Self]) -> String {
        let Some(first) = rules.first() else {
            return String::new();
        };
        let indent = "  ".repeat(first.wrappers.len());
        let mut css = String::new();
        for (depth, wrapper) in first.wrappers.iter().enumerate() {
            let _ = writeln!(css, "{}{wrapper} {{", "  ".repeat(depth));
        }
        for rule in rules {
            let selectors = rule.selectors.join(&format!(",\n{indent}"));
            let _ = writeln!(css, "{indent}{selectors} {{");
            for line in &rule.body {
                let _ = writeln!(css, "{indent}  {line}");
            }
            let _ = writeln!(css, "{indent}}}");
        }
        for depth in (0..first.wrappers.len()).rev() {
            let _ = writeln!(css, "{}}}", "  ".repeat(depth));
        }
        css
    }
}

fn written(rule: &Rule, scope: Scope<'_>, tokens: &BTreeSet<String>) -> Written {
    let mut wrappers: Vec<String> = Vec::new();
    if let Some(supports) = &rule.supports {
        wrappers.push(format!("@supports {supports}"));
    }
    /* Several media conditions are one query, each of them holding, and a
    window's width is one of them. */
    let queries: Vec<String> = rule
        .when
        .iter()
        .filter_map(|condition| match condition {
            Condition::Media { query } => Some(query.clone()),
            Condition::Window { below } => Some(format!("(width < {below})")),
            _ => None,
        })
        .collect();
    if !queries.is_empty() {
        wrappers.push(format!("@media {}", queries.join(" and ")));
    }
    for condition in &rule.when {
        if let Condition::Container { below } = condition {
            wrappers.push(format!("@container (inline-size < {below})"));
        }
    }
    /* Innermost, since `@starting-style` holds the rule's own values. */
    if rule.when.contains(&Condition::Entering) {
        wrappers.push("@starting-style".to_owned());
    }
    let mut body = Vec::new();
    for (name, value) in &rule.values {
        body.push(format!("--_{name}: {};", render(value, scope)));
    }
    for (property, value) in &rule.set {
        body.push(format!("{property}: {};", render(value, scope)));
    }
    Written {
        body,
        selectors: vec![selector(rule, tokens)],
        wrappers,
    }
}

/// The parts that share their element's `part` attribute with another, as
/// `row` does with `row-current` while the row is current, which a selector
/// matches by token.
/// A rule on a part of an element a box draws, `select-all-box`, written
/// through the box as the web reaches into another element's shadow root:
/// `[part="select-all"]::part(box)`. Any other rule as it is.
fn through_part<'a>(
    rule: &'a Rule,
    drawn: &BTreeMap<String, (String, String)>,
) -> std::borrow::Cow<'a, Rule> {
    match drawn.get(&rule.target) {
        Some((what, part)) => {
            let mut through = rule.clone();
            through.target.clone_from(what);
            through.inner = Some(format!(
                "::part({part}){}",
                rule.inner.as_deref().unwrap_or("")
            ));
            std::borrow::Cow::Owned(through)
        }
        None => std::borrow::Cow::Borrowed(rule),
    }
}

fn shared(tree: &[Node], into: &mut BTreeSet<String>) {
    for node in tree {
        if let Some(Attribute::Parts(also)) = node.attributes.get("also") {
            into.insert(node.name.clone());
            into.extend(also.keys().cloned());
        }
        shared(&node.children, into);
    }
}

#[cfg(test)]
mod tests {
    use super::value::number_css;
    use super::*;
    use crate::family::ir::family;
    use crate::family::read::default_export;

    fn css(table: &str) -> String {
        emit(&family(&default_export(table).unwrap()).unwrap())
    }

    #[test]
    fn writes_a_shared_part_by_token_and_content_passed_into_a_part() {
        let mut row = family(
            &default_export(
                "export default family('list-item', { rules: [{ on: 'row-current', set: [['color', 'red']] }, { on: 'start', set: [['margin', 0]], slotted: '*' }, { inner: '::before', on: 'rail', set: [['content', hook('rail-content', '\"\"')]] }, { on: 'host', set: [['opacity', 0.5]], when: { has: 'disabled' } }] })",
            )
            .unwrap(),
        )
        .unwrap();
        row.tree = crate::family::api::headless(
            &default_export(
                "export default headless('list-item', { tree: [box('row', { also: { 'row-current': bind('current') } })] })",
            )
            .unwrap(),
        )
        .unwrap()
        .tree;
        assert_eq!(
            shipped(&emit(&row)),
            ":host [part~=\"row-current\"] {color: red}:host [part=\"start\"]::slotted(*) {margin: 0}:host [part=\"rail\"]::before {content: var(--list-item-rail-content, \"\")}:host(:where([disabled])) {opacity: 0.5}"
        );
    }

    #[test]
    fn writes_any_of_several_interactions_as_is() {
        let written = css(
            "export default family('button', { rules: [{ on: 'button', set: [['color', 'red']], when: { disabled: false, interaction: ['hover', 'active'] } }] })",
        );
        assert_eq!(
            shipped(&written),
            ":host(:where(:not(:disabled))) [part=\"button\"]:where(:is(:hover, :active)) {color: red}"
        );
    }

    #[test]
    fn writes_host_conditions_in_one_order_and_interactions_on_the_part() {
        let written = css(
            "export default family('button', { rules: [{ on: 'button', set: [['color', hook('foreground-color', own('button-tone'))]], when: { disabled: false, emphasis: 'solid', hover: true } }] })",
        );
        assert_eq!(
            shipped(&written),
            ":host(:where(:not(:disabled)[emphasis=\"solid\"])) [part=\"button\"]:where(:hover) {color: var(--button-foreground-color, var(--_button-tone))}"
        );
    }

    #[test]
    fn wraps_a_media_condition_and_a_feature_query() {
        let written = css(
            "export default family('b', { rules: [{ on: 'spinner', set: [['animation-duration', own('b-crawl')]], when: { reducedMotion: true } }, { on: 'host', platform: 'web', selector: 'slot:not([name])', set: [['display', 'block']], supports: '(text-box: trim-both cap alphabetic)' }] })",
        );
        assert_eq!(
            shipped(&written),
            "@media (prefers-reduced-motion: reduce) {:host [part=\"spinner\"] {animation-duration: var(--_b-crawl)}}@supports (text-box: trim-both cap alphabetic) {slot:not([name]) {display: block}}"
        );
    }

    #[test]
    fn wraps_a_width_condition_in_a_container_query() {
        let written = css(
            "export default family('b', { rules: [{ on: 'list', set: [['gap', 0]], when: { direction: 'row', inlineSize: { below: '22rem' } } }] })",
        );
        assert_eq!(
            shipped(&written),
            "@container (inline-size < 22rem) {:host(:where([direction=\"row\"])) [part=\"list\"] {gap: 0}}"
        );
    }

    #[test]
    fn writes_rules_side_by_side_under_one_at_rule_in_one_block() {
        let written = css(
            "export default family('b', { rules: [{ on: 'track', set: [['outline', 'none']], when: { forcedColors: true } }, { on: 'fill', set: [['color', 'Highlight']], when: { forcedColors: true } }, { on: 'fill', set: [['color', 'red']] }, { on: 'track', set: [['color', 'red']], when: { forcedColors: true } }] })",
        );
        assert_eq!(
            shipped(&written),
            "@media (forced-colors: active) {:host [part=\"track\"] {outline: none}:host [part=\"fill\"] {color: Highlight}}:host [part=\"fill\"] {color: red}@media (forced-colors: active) {:host [part=\"track\"] {color: red}}"
        );
    }

    #[test]
    fn writes_an_exact_part_alone_beside_the_token_it_shares() {
        let mut skeleton = family(
            &default_export(
                "export default family('skeleton', { rules: [{ on: 'skeleton', set: [['display', 'block']] }, { exact: true, on: 'skeleton', set: [['inset', 0]], when: { state: 'wrapping' } }, { on: 'line', set: [['inline-size', '60%']], when: { child: ['last', 'later'] } }] })",
            )
            .unwrap(),
        )
        .unwrap();
        skeleton.tree = crate::family::api::headless(
            &default_export(
                "export default headless('skeleton', { tree: [box('skeleton'), box('skeleton', { also: { line: true } })] })",
            )
            .unwrap(),
        )
        .unwrap()
        .tree;
        assert_eq!(
            shipped(&emit(&skeleton)),
            ":host [part~=\"skeleton\"] {display: block}:host(:where(:state(wrapping))) [part=\"skeleton\"] {inset: 0}:host [part~=\"line\"]:where(:last-child:not(:first-child)) {inline-size: 60%}"
        );
        let refused = family(
            &default_export(
                "export default family('b', { rules: [{ exact: true, on: 'host', set: [] }] })",
            )
            .unwrap(),
        )
        .unwrap_err();
        assert!(refused.contains("`exact` is a part's"), "{refused}");
    }

    #[test]
    fn leaves_a_native_rule_out() {
        let written = css(
            "export default family('b', { rules: [{ on: 'svg', platform: 'native', set: [['scale', '-1 1']], when: { dir: 'rtl' } }, { on: 'svg', set: [['color', 'red']] }] })",
        );
        assert_eq!(shipped(&written), ":host [part=\"svg\"] {color: red}");
    }

    #[test]
    fn ships_a_stylesheet_the_way_build_styles_does() {
        let written = ":host {\n  /* why */\n  background-color: var(\n    --x,\n    color-mix(in oklab, red 6%, transparent)\n  );\n  border: thin solid\n    red;\n}\n";
        assert_eq!(
            shipped(written),
            ":host {background-color: var(--x, color-mix(in oklab, red 6%, transparent));border: thin solid red}"
        );
    }

    #[test]
    fn writes_a_number_the_way_css_does() {
        assert_eq!(number_css(0.0), "0");
        assert_eq!(number_css(0.5), "0.5");
        assert_eq!(number_css(86.0), "86");
    }
}
