use super::*;

fn text(value: &str) -> Attribute {
    Attribute::Text(value.to_owned())
}

fn bind(prop: &str) -> Attribute {
    Attribute::Bound(Binding::Bind(prop.to_owned()))
}

fn not(prop: &str) -> Attribute {
    Attribute::Bound(Binding::Not(prop.to_owned()))
}

#[test]
fn takes_what_the_table_names() {
    assert!(attribute(NodeKind::Pressable, "button", "busy", &bind("pending")).is_ok());
    assert!(attribute(
        NodeKind::Pressable,
        "button",
        "focusable-when-disabled",
        &bind("focusable-when-disabled")
    )
    .is_ok());
    assert!(attribute(
        NodeKind::Box,
        "spinner",
        "decorative",
        &Attribute::Flag(true)
    )
    .is_ok());
    assert!(attribute(NodeKind::Box, "tabs", "role", &text("tablist")).is_ok());
}

#[test]
fn takes_a_picked_string_where_each_string_it_picks_fits() {
    let picked = |toolbar: &str| Attribute::Picked {
        otherwise: "radiogroup".to_owned(),
        pick: "selection-mode".to_owned(),
        values: [("multiple".to_owned(), toolbar.to_owned())].into(),
    };
    assert!(attribute(NodeKind::Box, "row", "role", &picked("toolbar")).is_ok());
    let why = attribute(NodeKind::Box, "row", "role", &picked("nonsense")).unwrap_err();
    assert!(why.starts_with("`box('row')`: `role` takes one of"));
}

#[test]
fn refuses_a_name_the_table_lacks() {
    let why = attribute(NodeKind::Box, "tabs", "rol", &text("tablist")).unwrap_err();
    assert_eq!(why, "`box('tabs')`: `rol` is not an attribute");
}

#[test]
fn refuses_an_attribute_on_a_node_that_does_not_take_it() {
    let why = attribute(NodeKind::Region, "start", "sends", &text("press")).unwrap_err();
    assert_eq!(why, "`region('start')`: a region does not take `sends`");
}

#[test]
fn refuses_a_value_of_the_wrong_shape() {
    let role = attribute(NodeKind::Box, "tabs", "role", &text("nonsense")).unwrap_err();
    assert!(role.contains("one of `alert`, `alertdialog`, `banner`, `button`"));
    let says = attribute(NodeKind::Live, "live", "says", &not("pending")).unwrap_err();
    assert!(says.contains("a string, `bind()` or `derive()`"));
    let chooses = attribute(
        NodeKind::Pressable,
        "tab",
        "chooses",
        &Attribute::Flag(false),
    )
    .unwrap_err();
    assert!(chooses.contains("`true` alone"));
    let keys = attribute(NodeKind::Pressable, "control", "keys", &text("tab")).unwrap_err();
    assert_eq!(
        keys,
        "`pressable('control')`: `keys` takes one of `enter`, `space`"
    );
}

#[test]
fn a_part_is_decorative_while_a_prop_says_so() {
    for kind in [
        NodeKind::Box,
        NodeKind::Pressable,
        NodeKind::Region,
        NodeKind::Text,
    ] {
        assert!(attribute(kind, "line", "decorative", &bind("decorative")).is_ok());
        assert!(attribute(kind, "line", "decorative", &not("decorative")).is_ok());
        assert!(attribute(kind, "line", "decorative", &Attribute::Flag(false)).is_ok());
    }
    let live = attribute(NodeKind::Live, "live", "decorative", &Attribute::Flag(true));
    assert!(live.is_err());
}

#[test]
fn live_words_are_said_on_arrival_or_as_a_value_they_follow_changes() {
    assert!(attribute(NodeKind::Live, "live", "arrives", &Attribute::Flag(true)).is_ok());
    assert!(attribute(NodeKind::Live, "live", "follows", &bind("in-band")).is_ok());
    let flagged = attribute(NodeKind::Live, "live", "arrives", &Attribute::Flag(false));
    assert!(flagged.unwrap_err().contains("`true` alone"));
    let boxed = attribute(NodeKind::Box, "live", "follows", &bind("in-band")).unwrap_err();
    assert_eq!(boxed, "`box('live')`: a box does not take `follows`");
}

#[test]
fn a_glyph_is_named_or_bound_to_the_prop_that_names_it() {
    assert!(attribute(NodeKind::Box, "mark", "glyph", &text("x")).is_ok());
    assert!(attribute(NodeKind::Box, "svg", "glyph", &bind("name")).is_ok());
    let negated = attribute(NodeKind::Box, "svg", "glyph", &not("name")).unwrap_err();
    assert!(negated.contains("a string, `bind()` or `derive()`"));
}

#[test]
fn takes_each_role_wave_one_names() {
    for role in [
        "alert",
        "definition",
        "figure",
        "group",
        "heading",
        "img",
        "link",
        "list",
        "meter",
        "navigation",
        "progressbar",
        "radio",
        "radiogroup",
        "separator",
        "status",
        "term",
        "toolbar",
    ] {
        assert!(
            attribute(NodeKind::Box, "part", "role", &text(role)).is_ok(),
            "{role}"
        );
    }
}

#[test]
fn takes_a_kind_of_element_from_its_table() {
    for element in [
        "passage",
        "quotation",
        "key",
        "code",
        "description-list",
        "term",
    ] {
        assert!(attribute(NodeKind::Box, "part", "element", &text(element)).is_ok());
    }
    let why = attribute(NodeKind::Box, "part", "element", &text("blockquote")).unwrap_err();
    assert!(why.contains("one of `caption`, `citation`"), "{why}");
    assert!(attribute(NodeKind::Pressable, "part", "element", &text("code")).is_err());
}

#[test]
fn a_reading_is_a_number_or_a_prop() {
    let number = Attribute::Number(42.5);
    assert!(attribute(NodeKind::Box, "meter", "valuenow", &number).is_ok());
    assert!(attribute(NodeKind::Box, "meter", "valuemin", &bind("min")).is_ok());
    assert!(attribute(NodeKind::Box, "meter", "valuetext", &bind("reading")).is_ok());
    let words = attribute(NodeKind::Box, "meter", "valuenow", &text("4")).unwrap_err();
    assert!(words.ends_with("takes a number or `bind()`"));
    assert!(attribute(NodeKind::Box, "meter", "valuenow", &not("min")).is_err());
}

#[test]
fn a_level_and_a_line_count_are_whole() {
    assert!(attribute(NodeKind::Box, "heading", "level", &Attribute::Number(3.0)).is_ok());
    assert!(attribute(NodeKind::Box, "heading", "level", &bind("heading-level")).is_ok());
    assert!(attribute(NodeKind::Box, "heading", "level", &Attribute::Number(2.5)).is_err());
    assert!(attribute(NodeKind::Box, "heading", "level", &Attribute::Number(0.0)).is_err());
    assert!(attribute(NodeKind::Text, "words", "lines", &Attribute::Number(2.0)).is_ok());
    assert!(attribute(
        NodeKind::Pressable,
        "words",
        "lines",
        &Attribute::Number(2.0)
    )
    .is_err());
}

#[test]
fn takes_a_press_that_is_checked_or_pressed() {
    for name in ["checked", "pressed", "required", "readonly"] {
        assert!(
            attribute(NodeKind::Pressable, "control", name, &bind("on")).is_ok(),
            "{name}"
        );
    }
    assert!(attribute(NodeKind::Box, "control", "checked", &bind("on")).is_err());
    assert!(attribute(NodeKind::Pressable, "crumb", "current", &bind("current")).is_ok());
    assert!(attribute(NodeKind::Box, "crumb", "current", &text("page")).is_ok());
    assert!(attribute(NodeKind::Box, "content", "inert", &bind("loading")).is_ok());
    assert!(attribute(NodeKind::Box, "content", "closed", &not("open")).is_ok());
    assert!(attribute(NodeKind::Region, "default", "closed", &not("open")).is_err());
}

#[test]
fn a_part_is_described_by_words() {
    assert!(attribute(
        NodeKind::Pressable,
        "label",
        "description",
        &text("Complete")
    )
    .is_ok());
    assert!(attribute(NodeKind::Box, "label", "description", &bind("hint")).is_ok());
    assert!(attribute(NodeKind::Region, "label", "description", &text("Complete")).is_err());
}

#[test]
fn a_vector_names_its_box_and_its_geometry() {
    assert!(attribute(NodeKind::Box, "track", "viewBox", &text("0 0 100 100")).is_ok());
    assert!(attribute(NodeKind::Box, "track", "viewBox", &text("-1,-1, 2 2")).is_ok());
    for refused in ["0 0 100", "0 0 0 100", "a b c d", "0 0 100 100 1"] {
        assert!(
            attribute(NodeKind::Box, "track", "viewBox", &text(refused)).is_err(),
            "{refused}"
        );
    }
    assert!(attribute(NodeKind::Box, "groove", "r", &Attribute::Number(45.0)).is_ok());
    assert!(attribute(NodeKind::Box, "groove", "cx", &text("50%")).is_ok());
    assert!(attribute(NodeKind::Box, "groove", "cx", &text("50")).is_ok());
    assert!(attribute(NodeKind::Box, "groove", "cx", &text("half")).is_err());
    assert!(attribute(NodeKind::Box, "groove", "cx", &not("x")).is_err());
    let length = Attribute::Number(100.0);
    assert!(attribute(NodeKind::Box, "groove", "pathLength", &length).is_ok());
    assert!(attribute(
        NodeKind::Box,
        "groove",
        "pathLength",
        &Attribute::Number(0.0)
    )
    .is_err());
    assert!(attribute(NodeKind::Box, "mark", "d", &text("M4 12l5 5L20 6")).is_ok());
    assert!(attribute(NodeKind::Box, "mark", "d", &text("url(#a)")).is_err());
    assert!(attribute(NodeKind::Box, "mark", "shape", &text("polygon")).is_err());
}

#[test]
fn takes_words_derived_from_the_props() {
    let derived = Attribute::Derived {
        derive: "kbdKeys".to_owned(),
    };
    assert!(attribute(NodeKind::Text, "chord", "says", &derived).is_ok());
    assert!(attribute(NodeKind::Box, "kbd", "label", &derived).is_ok());
    let flag = attribute(NodeKind::Box, "kbd", "hidden", &derived).unwrap_err();
    assert!(flag.contains("`true`, `false`, `bind()` or `not()`"));
}

#[test]
fn takes_an_element_by_name_or_bound_to_a_tag() {
    assert!(attribute(NodeKind::Box, "code", "element", &text("code")).is_ok());
    assert!(attribute(NodeKind::Box, "text", "element", &bind("as")).is_ok());
    let why = attribute(NodeKind::Box, "text", "element", &text("span")).unwrap_err();
    assert!(why.contains("or `bind()` to a prop that holds an element's web tag"));
}

#[test]
fn takes_a_run_on_a_box_alone() {
    assert!(attribute(NodeKind::Box, "code", "run", &Attribute::Flag(true)).is_ok());
    assert!(attribute(NodeKind::Box, "text", "lines", &bind("lines")).is_ok());
    let why = attribute(NodeKind::Pressable, "button", "run", &Attribute::Flag(true)).unwrap_err();
    assert_eq!(
        why,
        "`pressable('button')`: a pressable does not take `run`"
    );
}

#[test]
fn takes_a_data_flag_on_a_box_and_a_press() {
    assert!(attribute(NodeKind::Box, "indicator", "data-dot", &bind("unset")).is_ok());
    assert!(attribute(
        NodeKind::Box,
        "indicator",
        "data-dot",
        &Attribute::Flag(true)
    )
    .is_ok());
    let worded = attribute(NodeKind::Box, "indicator", "data-dot", &text("yes")).unwrap_err();
    assert!(worded.contains("`data-dot` takes `true`, `false`, `bind()` or `not()`"));
    assert!(attribute(NodeKind::Pressable, "row", "data-dot", &bind("unset")).is_ok());
    let word = attribute(NodeKind::Text, "words", "data-dot", &bind("unset")).unwrap_err();
    assert!(word.contains("does not take `data-dot`"));
}

#[test]
fn takes_a_custom_property_on_a_box_and_a_press() {
    for value in [
        bind("fraction"),
        text("20%"),
        Attribute::Number(0.25),
        Attribute::Derived {
            derive: "meterFraction".to_owned(),
        },
    ] {
        assert!(attribute(NodeKind::Box, "indicator", "--meter-fraction", &value).is_ok());
    }
    let flag = attribute(
        NodeKind::Box,
        "indicator",
        "--meter-fraction",
        &Attribute::Flag(true),
    )
    .unwrap_err();
    assert!(flag.contains("takes a number, a string, `bind()` or `derive()`"));
    assert!(attribute(NodeKind::Pressable, "row", "--x", &text("1")).is_ok());
    let worded = attribute(NodeKind::Text, "words", "--x", &text("1")).unwrap_err();
    assert!(worded.contains("does not take `--x`"));
}

#[test]
fn takes_a_vector_with_no_view_box_a_bound_role_and_a_busy_box() {
    assert!(attribute(NodeKind::Box, "track", "viewBox", &text("none")).is_ok());
    assert!(attribute(NodeKind::Box, "track", "viewBox", &text("auto")).is_err());
    assert!(attribute(NodeKind::Box, "host", "role", &bind("spoken-role")).is_ok());
    assert!(attribute(NodeKind::Box, "host", "busy", &bind("loading")).is_ok());
    assert!(attribute(NodeKind::Region, "label", "names", &Attribute::Flag(true)).is_ok());
    assert!(attribute(NodeKind::Box, "label", "names", &Attribute::Flag(true)).is_err());
    assert!(attribute(NodeKind::Repeat, "line", "count", &bind("lines")).is_ok());
}

#[test]
fn takes_the_wave_two_roles_a_role_description_and_bound_geometry() {
    for role in ["note", "region"] {
        assert!(attribute(NodeKind::Box, "section", "role", &text(role)).is_ok());
    }
    let derived = Attribute::Derived {
        derive: "qrPath".to_owned(),
    };
    assert!(attribute(NodeKind::Box, "modules", "d", &derived).is_ok());
    assert!(attribute(NodeKind::Box, "dot", "r", &bind("radius")).is_ok());
    assert!(attribute(NodeKind::Box, "dot", "r", &not("radius")).is_err());
}
