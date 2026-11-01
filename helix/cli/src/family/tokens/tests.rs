use std::path::{Path, PathBuf};

use fusion_helix_theme::tokens::{Registry, Written};
use serde_json::{json, Value};

use super::{design_tokens, entries, modules, phone_registry, typed, Layer, System};

/// Helix, as its project names it.
fn system() -> System {
    System {
        name: "Helix".to_owned(),
        names: crate::family::project::testing(),
        vendor: "dev.fusion.helix".to_owned(),
    }
}

fn styles() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("../styles")
}

#[test]
fn every_entry_of_tokens_ts_is_typed_and_written_in_each_mode() {
    let source = std::fs::read_to_string(styles().join("src/tokens.ts")).unwrap();
    let read = entries(&source).unwrap();
    let layer = phone_registry(&styles()).unwrap_or_else(|failure| panic!("{}", failure.render("helix")));
    assert_eq!(layer.tokens().len(), read.len());
    let written = modules(&layer, &system(), "/* A header. */\n")
        .unwrap_or_else(|failure| panic!("{}", failure.render("helix")));
    let names: Vec<&str> = written.iter().map(|(name, _)| name.as_str()).collect();
    assert_eq!(
        names,
        [
            "light.generated.ts",
            "dark.generated.ts",
            "kinds.generated.ts"
        ]
    );
    for (_, text) in &written {
        let lines = text.lines().filter(|line| line.starts_with("  '")).count();
        assert_eq!(lines, read.len(), "{text}");
    }
    let light = &written[0].1;
    assert!(light.contains("export const light = {\n"), "{light}");
    assert!(
        light.contains("  'color-background': '#ffffff',\n"),
        "{light}"
    );
    assert!(light.contains("  'size-control': '2.5rem',\n"), "{light}");
    assert!(light.contains("  'border-thin': 1,\n"), "{light}");
    assert!(light.contains("  'duration-fast': 120,\n"), "{light}");
    assert!(
        light.contains(
            "  'font-sans': 'ui-sans-serif, system-ui, -apple-system, \"Segoe UI\", sans-serif',\n"
        ),
        "{light}"
    );
    assert!(written[1].1.contains("  'color-background': '#000000',\n"));
    let kinds = &written[2].1;
    assert!(kinds.contains("export const kinds = {\n"), "{kinds}");
    assert!(kinds.contains("  'size-control': 'length',\n"), "{kinds}");
    assert!(kinds.contains("  'duration-fast': 'time',\n"), "{kinds}");
    assert!(kinds.contains("  'leading-normal': 'number',\n"), "{kinds}");
    assert!(
        kinds.contains("  'color-background': 'color',\n"),
        "{kinds}"
    );
}

#[test]
fn an_entry_that_is_not_a_name_and_a_value_is_refused() {
    let read = entries("export const TOKENS: Token[] = [['space-none', rem(0)], ['oops']]");
    assert_eq!(
        read.unwrap_err(),
        "entry 2 of `TOKENS` does not open with a name and a value"
    );
    assert_eq!(
        entries("export const OTHER = []").unwrap_err(),
        "tokens.ts exports no `TOKENS` array"
    );
    assert_eq!(
        entries("export const TOKENS = [['size-x', times(rem(1),\n  2), 'A size.']]").unwrap(),
        [("size-x".to_owned(), "times(rem(1),\n  2)".to_owned())]
    );
}

/// The two files `design_tokens` writes, parsed.
fn written(layer: &Layer) -> (Value, Value) {
    let files =
        design_tokens(layer).unwrap_or_else(|failure| panic!("{}", failure.render("helix")));
    let parse = |name: &str| {
        let (_, text) = files
            .iter()
            .find(|(one, _)| one == name)
            .expect("the file is written");
        serde_json::from_str::<Value>(text).expect("the file is JSON")
    };
    (parse("helix.tokens.json"), parse("helix.resolver.json"))
}

/// A small layer with a token of each type the format has, an alias, a mode,
/// and a spring.
fn small() -> Layer {
    let tokens = [
        ("color-ink", "lightDark(hex('000000'), hex('ffffff'))"),
        ("color-scrim", "alpha(hex('000000'), 50)"),
        ("color-focus", "ref('color-ink')"),
        ("size-gap", "times(rem(1), 2)"),
        ("border-hair", "px(1)"),
        ("duration-quick", "ms(120)"),
        ("easing-out", "cubicBezier(0, 0, 0, 1)"),
        (
            "easing-bounce",
            "spring({ damping: 14.2, mass: 1, stiffness: 100 }, linear(0, 1.04, 1))",
        ),
        ("weight-bold", "700"),
        ("layer-top", "10"),
        ("font-body", "families('system-ui', quoted('Segoe UI'))"),
        (
            "shadow-lift",
            "shadow([0, px(4), px(12)], alpha(hex('000000'), 10))",
        ),
        ("tracking-loose", "em(0.1)"),
    ];
    let written: Vec<(String, Written)> = tokens
        .iter()
        .map(|(name, value)| ((*name).to_owned(), Written::Builder((*value).to_owned())))
        .collect();
    let base: Registry =
        typed(&[], &written).unwrap_or_else(|failure| panic!("{}", failure.render("helix")));
    Layer {
        base,
        densities: Vec::new(),
        system: system(),
    }
}

#[test]
fn a_token_of_each_type_is_written_as_the_format_types_it() {
    let (file, _) = written(&small());
    let value = |group: &str, name: &str| file[group][name].clone();
    assert_eq!(
        value("color", "ink")["$value"],
        json!({ "colorSpace": "srgb", "components": [0, 0, 0], "hex": "#000000" })
    );
    assert_eq!(value("color", "scrim")["$value"]["alpha"], json!(0.5));
    assert_eq!(
        value("size", "gap")["$value"],
        json!({ "value": 2, "unit": "rem" })
    );
    assert_eq!(
        value("border", "hair")["$value"],
        json!({ "value": 1, "unit": "px" })
    );
    assert_eq!(
        value("duration", "quick")["$value"],
        json!({ "value": 120, "unit": "ms" })
    );
    assert_eq!(value("easing", "out")["$value"], json!([0, 0, 0, 1]));
    assert_eq!(value("weight", "bold")["$type"], "fontWeight");
    assert_eq!(
        value("layer", "top"),
        json!({ "$type": "number", "$value": 10, "$extensions": { "dev.fusion.helix": { "css": "10" } } })
    );
    assert_eq!(
        value("font", "body")["$value"],
        json!(["system-ui", "Segoe UI"])
    );
    assert_eq!(
        value("shadow", "lift")["$value"]["offsetY"],
        json!({ "value": 4, "unit": "px" })
    );
    assert_eq!(
        value("shadow", "lift")["$value"]["spread"],
        json!({ "value": 0, "unit": "px" })
    );
    assert_eq!(
        value("size", "gap")["$extensions"]["dev.fusion.helix"]["css"],
        "calc(1rem * 2)"
    );
}

#[test]
fn a_reference_to_another_token_is_an_alias_of_it() {
    let (file, resolver) = written(&small());
    assert_eq!(file["color"]["focus"]["$value"], "{color.ink}");
    assert_eq!(file["color"]["focus"]["$type"], "color");
    let dark = &resolver["modifiers"]["mode"]["contexts"]["dark"][0]["color"];
    assert!(
        dark.get("focus").is_none(),
        "an alias follows its token: {dark}"
    );
}

#[test]
fn dark_mode_holds_each_token_whose_value_moves() {
    let (_, resolver) = written(&small());
    let mode = &resolver["modifiers"]["mode"];
    assert_eq!(mode["default"], "light");
    assert_eq!(mode["contexts"]["light"], json!([]));
    let dark = &mode["contexts"]["dark"][0];
    assert_eq!(dark["color"]["ink"]["$value"]["hex"], "#ffffff");
    assert!(dark.get("size").is_none(), "{dark}");
    assert_eq!(resolver["version"], "2025.10");
    assert_eq!(
        resolver["resolutionOrder"],
        json!([
            { "$ref": "#/sets/helix" },
            { "$ref": "#/modifiers/mode" },
            { "$ref": "#/modifiers/density" }
        ])
    );
}

#[test]
fn a_spring_and_a_length_in_ems_are_kept_in_their_group_extensions() {
    let (file, _) = written(&small());
    assert!(file["easing"].get("bounce").is_none());
    assert_eq!(
        file["easing"]["$extensions"]["dev.fusion.helix"]["untyped"]["bounce"],
        json!({
            "css": "linear(0, 1.04, 1)",
            "spring": { "damping": 14.2, "mass": 1, "stiffness": 100 }
        })
    );
    assert_eq!(
        file["tracking"]["$extensions"]["dev.fusion.helix"]["untyped"]["loose"],
        json!({ "css": "0.1em" })
    );
}

#[test]
fn the_token_layer_is_written_with_its_modes_and_densities() {
    let layer = Layer::read(&styles(), system())
        .unwrap_or_else(|failure| panic!("{}", failure.render("helix")));
    let (file, resolver) = written(&layer);
    assert_eq!(file["size"]["control"]["$value"], "{size.control-md}");
    assert_eq!(file["color"]["background"]["$value"]["hex"], "#ffffff");
    let density = &resolver["modifiers"]["density"];
    assert_eq!(density["default"], "md");
    assert_eq!(density["contexts"]["md"], json!([]));
    assert_eq!(
        density["contexts"]["sm"][0]["size"]["control"]["$value"],
        "{size.control-sm}"
    );
    assert_eq!(
        density["contexts"]["lg"][0]["text"]["control"]["$value"],
        "{text.control-lg}"
    );
    assert_eq!(
        density["contexts"]["sm"][0]["size"]["control-tight"]["$value"],
        json!({ "value": 1.625, "unit": "rem" })
    );
    let dark = &resolver["modifiers"]["mode"]["contexts"]["dark"][0];
    assert_eq!(dark["color"]["background"]["$value"]["hex"], "#000000");
    let spring = &file["easing"]["$extensions"]["dev.fusion.helix"]["untyped"]["spring"]["spring"];
    assert_eq!(spring["damping"], json!(14.2));
}

#[test]
fn css_the_builders_wrote_differently_is_refused() {
    let layer = small();
    let mut tokens: Vec<Value> = layer
        .base
        .tokens()
        .iter()
        .map(|token| json!({ "name": format!("--helix-{}", token.name), "value": token.css }))
        .collect();
    let agreed = json!({ "tokens": tokens }).to_string();
    assert!(layer.held_to_stylesheet(&agreed).is_ok());
    tokens[3]["value"] = json!("calc(1rem*2)");
    let failure = layer
        .held_to_stylesheet(&json!({ "tokens": tokens }).to_string())
        .expect_err("a different spelling is refused");
    assert!(failure.render("helix").contains("--helix-size-gap"));
}

#[test]
fn the_names_are_each_entry_of_tokens_ts_and_none_without_it() {
    let names = super::names(&styles()).unwrap().unwrap();
    assert!(names.contains("color-foreground"));
    assert!(!names.iter().any(|name| name.starts_with("--")));
    assert!(super::names(&styles().join("missing")).unwrap().is_none());
}
