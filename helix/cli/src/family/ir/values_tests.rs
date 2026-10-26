use std::path::Path;

use super::DERIVATIONS;
use crate::family::ir::{family, Item, Keyword, MixSpace, Op, QuoteMark, Value};
use crate::family::read::default_export;

#[test]
fn refuses_a_custom_property_read_inside_a_string() {
    let refused = read("block-size", "web('calc(var(--_kbd-height) / 2)')").unwrap_err();
    assert!(refused.contains("inside a string"), "{refused}");
    assert!(read("vertical-align", "'calc(0.5cap - 0.5em)'").is_ok());
}

/// The first declaration's value in a table that sets `property`.
fn read(property: &str, value: &str) -> Result<Value, String> {
    let table = format!(
        "export default family('b', {{ rules: [{{ on: 'host', set: [['{property}', {value}]] }}] }})"
    );
    let read = family(&default_export(&table).unwrap())?;
    match read.rules.into_iter().next() {
        Some(Item::Rule(mut rule)) => Ok(rule.set.remove(0).1),
        _ => panic!("a rule"),
    }
}

#[test]
fn reads_each_css_wide_keyword_as_a_whole_value() {
    let Ok(Value::Hook {
        fallback: Some(fallback),
        ..
    }) = read("color", "hook('color', inherit())")
    else {
        panic!("a hook");
    };
    assert!(matches!(*fallback, Value::Keyword(Keyword::Inherit)));
    assert!(matches!(
        read("margin", "inherit()"),
        Ok(Value::Keyword(Keyword::Inherit))
    ));
    assert!(read("margin", "['1px', inherit()]")
        .unwrap_err()
        .contains("`inherit()` is a whole value"));
}

#[test]
fn reads_another_familys_hook_by_its_prefix() {
    let Ok(Value::Hook { name, of, fallback }) = read(
        "border-end-end-radius",
        "hookOf('button', 'radius-end-end', token('radii-sm'))",
    ) else {
        panic!("a hook");
    };
    assert_eq!(
        (name.as_str(), of.as_deref()),
        ("radius-end-end", Some("button"))
    );
    assert!(fallback.is_some());
}

#[test]
fn reads_a_quotient_as_division() {
    let Ok(Value::Calc { op, operands }) = read("margin", "quotient(own('s'), 2)") else {
        panic!("a calc");
    };
    assert_eq!(op, Op::Divide);
    assert_eq!(operands.len(), 2);
}

#[test]
fn refuses_a_quotient_by_a_length_by_zero_or_of_three() {
    let by_length = read("margin", "quotient(own('s'), '2px')").unwrap_err();
    assert!(by_length.contains("`2px` is not one"), "{by_length}");
    assert!(read("margin", "quotient(own('s'), 0)")
        .unwrap_err()
        .contains("by zero"));
    assert!(read("margin", "quotient(own('s'), 2, 3)")
        .unwrap_err()
        .contains("`quotient()`"));
}

#[test]
fn reads_inherit_as_a_whole_value_and_a_fallback() {
    assert!(matches!(
        read("font", "inherit()"),
        Ok(Value::Keyword(Keyword::Inherit))
    ));
    assert!(read("font-family", "hook('font-family', inherit())").is_ok());
    for inner in [
        "sum(inherit(), '1px')",
        "['1px', inherit()]",
        "scheme(inherit(), 'red')",
    ] {
        let refused = read("margin", inner).unwrap_err();
        assert!(
            refused.contains("`inherit()` is a whole value"),
            "{refused}"
        );
    }
}

#[test]
fn reads_a_quotation_mark_in_content_only() {
    assert!(matches!(
        read("content", "quote('no-open')"),
        Ok(Value::Quote {
            alt: None,
            mark: QuoteMark::NoOpen
        })
    ));
    assert!(read("content", "[quote('open'), fn('counter', 'n')]").is_ok());
    assert!(read("--b-mark", "quote('open')").is_ok());
    let elsewhere = read("font-family", "quote('open')").unwrap_err();
    assert_eq!(
        elsewhere,
        "rule 1: `font-family`: `quote()` is a value of `content` only"
    );
    let unknown = read("content", "quote('double')").unwrap_err();
    assert!(unknown.contains("`quote('double')`"), "{unknown}");
    assert!(read("content", "fn('x', quote('open'))")
        .unwrap_err()
        .contains("one of its words"));
}

#[test]
fn reads_a_scheme_as_its_two_values() {
    let Ok(Value::Scheme { dark, light }) = read("color", "scheme('black', 'white')") else {
        panic!("a scheme");
    };
    assert!(
        matches!((*light, *dark), (Value::Text(light), Value::Text(dark)) if light == "black" && dark == "white")
    );
    assert!(read("color", "scheme('black')").is_err());
}

#[test]
fn reads_a_derived_value_with_the_function_that_computes_it() {
    let Ok(Value::Derived { function, name, .. }) =
        read("grid-template-columns", "derived('grid-template', 'none')")
    else {
        panic!("a derived value");
    };
    assert_eq!(
        (function.as_str(), name.as_str()),
        ("gridTemplate", "grid-template")
    );
    let refused = read("gap", "derived('grid-gap')").unwrap_err();
    assert!(refused.starts_with(
        "rule 1: `derived('grid-gap')` names no function in core's derivations, which compute "
    ));
    assert!(refused.contains("grid-template, kbd-keys, kbd-words"));
}

#[test]
fn every_derivation_names_a_function_core_exports() {
    let folder = Path::new(env!("CARGO_MANIFEST_DIR")).join("../core/src/utils/derivations");
    let mut source = std::fs::read_to_string(folder.join("derivations.ts")).unwrap();
    /* The modules it exports every derivation of, as Meter's, Progress's and
    Skeleton's are. */
    let more: Vec<String> = source
        .lines()
        .filter_map(|line| line.strip_prefix("export * from '")?.strip_suffix(".js'"))
        .map(|module| std::fs::read_to_string(folder.join(format!("{module}.ts"))).unwrap())
        .collect();
    source.push_str(&more.concat());
    for (name, function) in DERIVATIONS {
        assert!(
            source.contains(&format!("export const {function}: Derivation ="))
                /* A clock's, which answers in milliseconds. */
                || source.contains(&format!("export const {function}: Expiry =")),
            "`{name}` names `{function}`, which core's derivations do not export"
        );
    }
}

#[test]
fn reads_a_mix_in_srgb_and_refuses_another_space() {
    assert!(matches!(
        read("color", "mix(token('a'), 14, token('b'), 'srgb')"),
        Ok(Value::Mix {
            space: Some(MixSpace::Srgb),
            ..
        })
    ));
    assert!(matches!(
        read("color", "mix(token('a'), 14, token('b'))"),
        Ok(Value::Mix { space: None, .. })
    ));
    assert!(read("color", "mix(token('a'), 14, token('b'), 'hsl')")
        .unwrap_err()
        .contains("`srgb`, and not `hsl`"));
}

#[test]
fn reads_a_fit_as_a_whole_value_of_a_grid_row() {
    assert!(matches!(
        read("grid-template-rows", "fit(1)"),
        Ok(Value::Fit(share)) if (share - 1.0).abs() < f64::EPSILON
    ));
    assert!(matches!(
        read("grid-template-rows", "web(fit(0))"),
        Ok(Value::Web(_))
    ));
    let elsewhere = read("block-size", "fit(1)").unwrap_err();
    assert!(
        elsewhere.contains("`fit()` is a value of `grid-template-rows` only"),
        "{elsewhere}"
    );
    let share = read("grid-template-rows", "fit(0.5)").unwrap_err();
    assert!(share.contains("takes `0`, closed, or `1`, open"), "{share}");
    let word = read("grid-template-rows", "['auto', fit(1)]").unwrap_err();
    assert!(word.contains("whole value"), "{word}");
}

#[test]
fn reads_the_safe_area_from_its_helper_alone() {
    assert!(matches!(
        read("padding-block-end", "safeArea('bottom')"),
        Ok(Value::Function { arguments, name })
            if name == "env"
                && matches!(arguments.as_slice(), [Value::Text(inset), Value::Text(zero)]
                    if inset == "safe-area-inset-bottom" && zero == "0px")
    ));
    let edge = read("padding-block-end", "safeArea('end')").unwrap_err();
    assert!(edge.contains("names an edge of the window"), "{edge}");
    let written = read("padding-block-end", "fn('env', 'safe-area-inset-bottom')").unwrap_err();
    assert!(written.contains("`safeArea('bottom')`"), "{written}");
    let string = read("padding-block-end", "'env(safe-area-inset-bottom)'").unwrap_err();
    assert!(
        string.contains("reads the safe area inside a string"),
        "{string}"
    );
}
