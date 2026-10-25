use serde_json::Value;

use super::{derive_modes, DerivedMode, Refusal};

/// The themes `fusion-helix-theme` records from its own derivations, which the
/// WebAssembly module is held to by `turbo run wasm-check`.
const ORACLE: &str = include_str!("../../theme/rust/oracle.json");

/// The oracle theme of `label`, as the name and hex of each token, and its
/// violations.
fn recorded(label: &str) -> DerivedMode {
    let oracle: Value = serde_json::from_str(ORACLE).expect("the oracle is JSON");
    let theme = oracle["themes"]
        .as_array()
        .expect("the oracle holds themes")
        .iter()
        .find(|theme| theme["label"] == label)
        .unwrap_or_else(|| panic!("the oracle records `{label}`"));
    let text = |value: &Value| value.as_str().expect("a string").to_owned();
    DerivedMode {
        colors: theme["tokens"]
            .as_array()
            .expect("a theme holds tokens")
            .iter()
            .map(|token| super::DerivedColor {
                hex: text(&token["hex"]),
                name: text(&token["name"]),
            })
            .collect(),
        violations: theme["violations"]
            .as_array()
            .expect("a theme holds violations")
            .iter()
            .map(text)
            .collect(),
    }
}

fn refusal(intent: &str) -> String {
    match derive_modes(intent) {
        Ok(_) => panic!("`{intent}` is refused"),
        Err(Refusal::Intent { reason }) => reason,
    }
}

/// Each pair of themes the oracle records for one intent in both schemes is
/// what this crate derives for that intent, color for color and in order.
#[test]
fn each_mode_is_the_theme_the_oracle_records() {
    for (intent, light, dark) in [
        ("{}", "ink", "ink-dark"),
        (r##"{"brand":"#3b82f6"}"##, "default", "dark"),
        (
            r##"{"brand":"#3b82f6","separation":{"surface":"fill"}}"##,
            "fill",
            "dark-fill",
        ),
        (
            r##"{"brand":{"dark":"#7dd3fc","light":"#1e3a8a"}}"##,
            "two-brands",
            "two-brands-dark",
        ),
    ] {
        let modes = derive_modes(intent).expect("the intent derives");
        assert_eq!(modes.light, recorded(light), "{intent} in light mode");
        assert_eq!(modes.dark, recorded(dark), "{intent} in dark mode");
    }
}

#[test]
fn the_intent_scheme_is_set_aside() {
    assert_eq!(
        derive_modes(r##"{"brand":"#c1272d","scheme":"dark"}"##).expect("the intent derives"),
        derive_modes(r##"{"brand":"#c1272d"}"##).expect("the intent derives"),
    );
}

#[test]
fn a_refusal_names_the_field_it_is_about() {
    assert_eq!(
        refusal(r#"{"brand": 255}"#),
        "brand is not a color this engine can read, or one for each scheme, received 255"
    );
    assert_eq!(
        refusal(r#"{"contrastTraget": 7}"#),
        "unknown field `contrastTraget`, expected one of `accent`, `background`, `brand`, \
         `chroma`, `contrastTarget`, `density`, `font`, `material`, `motion`, `namespace`, \
         `neutral`, `pairings`, `radius`, `scheme`, `separation`, `status`, `tokens`"
    );
    assert!(refusal("brand").starts_with("expected value"));
}
