use super::theme::{color, float, length};
use super::{field, pascal};

#[test]
fn a_name_is_a_field_in_snake_case_and_a_type_in_pascal_case() {
    assert_eq!(field("padding-inline"), "padding_inline");
    assert_eq!(field("pointerType"), "pointer_type");
    assert_eq!(field("type"), "type_");
    assert_eq!(pascal("top-start"), "TopStart");
    assert_eq!(pascal("button"), "Button");
}

#[test]
fn a_token_value_is_a_rust_expression() {
    assert_eq!(color("#1A4DE6").unwrap(), "gpui::rgba(0x1a4de6ff).into()");
    assert_eq!(color("#00000080").unwrap(), "gpui::rgba(0x00000080).into()");
    assert_eq!(
        length("0.375rem").unwrap(),
        "AbsoluteLength::Rems(gpui::rems(0.375))"
    );
    assert_eq!(
        length("4px").unwrap(),
        "AbsoluteLength::Pixels(gpui::px(4.0))"
    );
    assert!(
        length("1em").is_err(),
        "an em needs the font size where it lands"
    );
    assert_eq!(float(2.0), "2.0");
    assert_eq!(float(0.5), "0.5");
}
