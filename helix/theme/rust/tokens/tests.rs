//! The token layer as it ships: every token typed and printed back, and the
//! values native takes held to what `paint.mjs` and the stylesheet say.
//!
//! **`tokens.ts` is read here by a scanner of its own**, and the command line
//! reads it with a TypeScript parser, so the two readers check each other.

use super::syntax::{self, Node};
use super::{declarations, declared_on_coarse, native, Kind, Mode, Native, Registry, Written};

const PRIMITIVES: &str = include_str!("../../../styles/src/primitives.css");
const MODES: &str = include_str!("../../../styles/src/_modes.css");
const TOKENS: &str = include_str!("../../../styles/src/tokens.ts");

/// One `[name, value, description?]` entry's parts, as the text of each.
#[derive(Default)]
struct Entry {
    parts: Vec<String>,
    current: String,
}

impl Entry {
    fn close_part(&mut self) {
        let part = std::mem::take(&mut self.current);
        if !part.trim().is_empty() {
            self.parts.push(part.trim().to_owned());
        }
    }
}

/// Each `[name, value, description?]` entry of `TOKENS`, as its name and the
/// builder calls its value is written in, comments skipped.
fn entries() -> Vec<(String, Written)> {
    let start = TOKENS
        .find("export const TOKENS: Token[] = [")
        .expect("tokens.ts exports TOKENS")
        + "export const TOKENS: Token[] = [".len();
    let mut found = Vec::new();
    let mut entry = Entry::default();
    let mut depth = 0usize;
    let mut characters = TOKENS[start..].chars().peekable();
    while let Some(character) = characters.next() {
        match character {
            '/' if characters.peek() == Some(&'*') => {
                let mut last = ' ';
                for one in characters.by_ref() {
                    if last == '*' && one == '/' {
                        break;
                    }
                    last = one;
                }
            }
            '\'' => {
                entry.current.push('\'');
                while let Some(one) = characters.next() {
                    entry.current.push(one);
                    if one == '\\' {
                        entry.current.extend(characters.next());
                    } else if one == '\'' {
                        break;
                    }
                }
            }
            '[' if depth == 0 => {
                depth = 1;
                entry = Entry::default();
            }
            '[' | '(' | '{' => {
                depth += 1;
                entry.current.push(character);
            }
            ']' if depth == 1 => {
                depth = 0;
                entry.close_part();
                let [name, value, ..] = entry.parts.as_slice() else {
                    panic!("an entry of TOKENS holds a name and a value");
                };
                let name = name.trim_matches('\'').to_owned();
                found.push((name, Written::Builder(value.clone())));
            }
            ']' if depth == 0 => break,
            ']' | ')' | '}' => {
                depth -= 1;
                entry.current.push(character);
            }
            ',' if depth == 1 => entry.close_part(),
            _ if depth >= 1 => entry.current.push(character),
            _ => {}
        }
    }
    found
}

fn layer() -> Registry {
    let mut declared = declarations(PRIMITIVES);
    declared.extend(declarations(MODES));
    Registry::written(&declared, &entries()).unwrap_or_else(|refusals| {
        panic!("the token layer does not type:\n{}", refusals.join("\n"))
    })
}

fn value(registry: &Registry, name: &str, mode: Mode) -> Native {
    let token = registry
        .tokens()
        .iter()
        .find(|token| token.name == name)
        .unwrap_or_else(|| panic!("no token `{name}`"));
    native(&registry.evaluate(token, mode).expect("the token evaluates"))
}

fn text(value: &str) -> Native {
    Native::Text(value.to_owned())
}

#[test]
fn every_token_is_typed_and_prints_back_as_written() {
    let entries = entries();
    let registry = layer();
    assert!(
        entries.len() > 150,
        "the scanner read {} tokens",
        entries.len()
    );
    assert_eq!(registry.tokens().len(), entries.len());
    assert!(registry.typed_declarations() > 80);
    for token in registry.tokens() {
        for mode in [Mode::Light, Mode::Dark] {
            registry
                .evaluate(token, mode)
                .unwrap_or_else(|why| panic!("{why}"));
        }
    }
}

#[test]
fn a_category_decides_a_kind_and_a_value_decides_the_rest() {
    let registry = layer();
    let kind = |name: &str| {
        registry
            .tokens()
            .iter()
            .find(|token| token.name == name)
            .map(|token| token.kind)
    };
    assert_eq!(kind("radii-none"), Some(Kind::Length));
    assert_eq!(kind("layer-base"), Some(Kind::Number));
    assert_eq!(kind("leading-heading"), Some(Kind::Length));
    assert_eq!(kind("leading-tight"), Some(Kind::Number));
    assert_eq!(kind("material-backdrop"), Some(Kind::Filter));
    assert_eq!(kind("material-border"), Some(Kind::Color));
    assert_eq!(kind("material-opacity"), Some(Kind::Number));
    assert_eq!(kind("shadow-floating"), Some(Kind::Shadow));
}

/// Hexes `paint.mjs` resolved for these tokens on November 1, 2026: the ends
/// of the ramp, a mix of two rungs, a scrim, a relative color off a hex, the
/// most out-of-gamut series, and two translucent materials.
#[test]
fn colors_are_the_hex_paint_resolves() {
    let registry = layer();
    for (name, light, dark) in [
        ("color-background", "#ffffff", "#000000"),
        ("color-border", "#e8e8e8", "#212121"),
        ("color-overlay", "#0b0b0b66", "#0b0b0ba3"),
        ("color-primary", "#181818", "#e1e1e1"),
        ("color-syntax-constant", "#b45528", "#ffa657"),
        ("color-series-3", "#00a08a", "#00fede"),
        ("color-warning-muted", "#7c6545", "#e8bc7f"),
        ("material-translucent", "#ffffff4d", "#12121299"),
        ("material-modal", "#ffffffe0", "#12121299"),
        ("material-panel", "#ffffffb8", "#12121299"),
        ("color-press", "#00000029", "#ffffff33"),
        ("color-primary-wash", "#18181824", "#e1e1e124"),
        ("color-warning-mark", "#b97b00", "#ffaf00"),
        ("color-border-hover", "#959595", "#6c6c6c"),
        ("color-foreground-on-primary", "#ffffff", "#000000"),
        ("scrollbar-track-color", "#00000000", "#00000000"),
    ] {
        assert_eq!(value(&registry, name, Mode::Light), text(light), "{name}");
        assert_eq!(value(&registry, name, Mode::Dark), text(dark), "{name}");
    }
}

#[test]
fn lengths_keep_their_rems_and_the_rest_is_what_native_reads() {
    let registry = layer();
    let light = |name| value(&registry, name, Mode::Light);
    assert_eq!(light("size-control"), text("2.5rem"));
    assert_eq!(light("size-control-tight"), text("2rem"));
    assert_eq!(light("text-sm"), text("0.8125rem"));
    assert_eq!(light("space-md"), text("1rem"));
    assert_eq!(light("radii-sm"), text("0.25rem"));
    assert_eq!(light("space-none"), Native::Number(0.0));
    assert_eq!(light("radii-full"), Native::Number(9999.0));
    assert_eq!(light("border-thin"), Native::Number(1.0));
    assert_eq!(light("size-focus-reach"), Native::Number(4.0));
    assert_eq!(light("text-field-min"), Native::Number(0.0));
    assert_eq!(light("size-target"), text("1.5rem"));
    assert_eq!(light("text-control-md"), text("0.8125rem"));
    let coarse = declared_on_coarse(MODES);
    let coarsely = |name: &str| {
        coarse
            .iter()
            .find(|(known, _)| known == name)
            .map(|(_, value)| value.as_str())
    };
    assert_eq!(coarsely("--_helix-size-target"), Some("2.75rem"));
    assert_eq!(coarsely("--_helix-text-field-min"), Some("16px"));
    assert_eq!(
        coarsely("--_helix-text-control-md"),
        Some("var(--helix-text-md)")
    );
    assert_eq!(light("text-field"), text("0.875rem"));
    assert_eq!(light("opacity-disabled"), Native::Number(0.5));
    assert_eq!(light("tracking-tight"), text("-0.01em"));
    assert_eq!(light("leading-heading"), text("calc(0.99em + 0.5rem)"));
    assert_eq!(light("duration-fast"), Native::Number(120.0));
    assert_eq!(light("weight-medium"), Native::Number(500.0));
    assert_eq!(light("easing-standard"), text("cubic-bezier(0.2, 0, 0, 1)"));
    assert_eq!(light("material-backdrop"), text("blur(16px) saturate(1.5)"));
    assert_eq!(light("shadow-surface"), text("none"));
    assert_eq!(light("shadow-floating"), text("0px 12px 32px #0b0b0b17"));
    assert_eq!(
        value(&registry, "shadow-floating", Mode::Dark),
        text("0px 12px 32px #0b0b0b24")
    );
    assert_eq!(
        light("font-display"),
        text("ui-sans-serif, system-ui, -apple-system, \"Segoe UI\", sans-serif")
    );
}

#[test]
fn a_length_in_several_units_is_written_as_the_calc_of_each() {
    let tokens = [
        ("size-a".to_owned(), "calc(1rem + 2px)".to_owned()),
        ("size-b".to_owned(), "calc(0.5em + 1rem - 4px)".to_owned()),
        ("size-c".to_owned(), "calc(1rem * 3 / 4)".to_owned()),
        ("size-d".to_owned(), "calc(1rem - 1rem + 2px)".to_owned()),
    ];
    let registry = Registry::new(&[], &tokens).expect("the lengths are typed");
    let light = |name| value(&registry, name, Mode::Light);
    assert_eq!(light("size-a"), text("calc(1rem + 2px)"));
    assert_eq!(light("size-b"), text("calc(0.5em + 1rem + -4px)"));
    assert_eq!(light("size-c"), text("0.75rem"));
    assert_eq!(light("size-d"), Native::Number(2.0));
}

#[test]
fn a_value_the_grammar_does_not_admit_is_refused_with_a_sentence() {
    let declared = declarations(PRIMITIVES);
    let refused = |name: &str, value: &str| {
        Registry::new(&declared, &[(name.to_owned(), value.to_owned())])
            .expect_err("the value is refused")
            .join("\n")
    };
    assert!(refused("color-x", "color-mix(in srgb, red, blue)").contains("other than oklab"));
    assert!(refused("color-x", "var(--_helix-nothing)").contains("declared nowhere"));
    assert!(refused("size-x", "calc(1rem * 2px)").contains("mixes a number and a length"));
    assert!(refused("weight-x", "1rem").contains("its category holds Number tokens"));
    assert!(refused("motion-x", "1ms").contains("category `motion`"));
    assert!(refused("color-x", "url(x)").contains("is not a color"));
}

#[test]
fn a_reference_through_itself_is_refused() {
    let tokens = [
        ("size-a".to_owned(), "var(--helix-size-b)".to_owned()),
        ("size-b".to_owned(), "var(--helix-size-a)".to_owned()),
    ];
    let refusals = Registry::new(&[], &tokens).expect_err("a cycle is refused");
    assert!(refusals.join("\n").contains("resolves through itself"));
}

#[test]
fn a_sign_starts_a_number_a_name_or_an_operator() {
    let words = |text: &str| syntax::words(&syntax::parse(text).expect("parses"));
    assert_eq!(
        words("l - 0.05"),
        [
            Node::Ident("l".into()),
            Node::Operator('-'),
            Node::Number(0.05)
        ]
    );
    assert_eq!(words("-0.01em"), [Node::Dimension(-0.01, "em".into())]);
    assert_eq!(
        words("-apple-system"),
        [Node::Ident("-apple-system".into())]
    );
    assert!(syntax::parse("calc(1rem").is_err());
}
