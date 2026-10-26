use super::*;
use crate::family::read::default_export;

#[test]
fn names_the_root_of_a_family_or_an_element_written_out() {
    let call = |over: &str| {
        Lit::Call(
            "family".to_owned(),
            vec![
                Lit::Text("copy-button".to_owned()),
                Lit::Object(vec![("over".to_owned(), Lit::Text(over.to_owned()))]),
            ],
        )
    };
    assert_eq!(
        over(&call("icon-button")),
        Some("icon-button/root".to_owned())
    );
    assert_eq!(over(&call("tabs/tab")), Some("tabs/tab".to_owned()));
    let none = default_export("export default family('b', { rules: [] })").unwrap();
    assert_eq!(over(&none), None);
}

#[test]
fn names_the_family_of_each_hook_that_names_none() {
    let mut value = Value::Calc {
        op: crate::family::ir::Op::Add,
        operands: vec![
            Value::Hook {
                fallback: Some(Box::new(Value::Hook {
                    fallback: None,
                    name: "radius-end".to_owned(),
                    of: Some("button".to_owned()),
                })),
                name: "size".to_owned(),
                of: None,
            },
            Value::Token("space-xs".to_owned()),
        ],
    };
    qualify(&mut value, "icon-button");
    let Value::Calc { operands, .. } = &value else {
        panic!("still arithmetic")
    };
    let Value::Hook { fallback, of, .. } = &operands[0] else {
        panic!("still a hook")
    };
    assert_eq!(of.as_deref(), Some("icon-button"));
    let Some(inner) = fallback.as_deref() else {
        panic!("still a fallback")
    };
    assert!(matches!(inner, Value::Hook { of: Some(family), .. } if family == "button"));
}
