use crate::family::read::{headless_tsx, Lit};

/// A source with a render, and the keys before it that every test reads.
fn source(given: &str, render: &str) -> String {
    format!(
        "import {{ headless }} from '../../../render.js'
export default headless('x', {{
  derived: {{ holdHint: derive('menu-hold-hint'), rows: bind('default') }},
  events: {{ beforeSelect: cancelable(['value']), dismiss: [] }},
  props: {{ dismissLabel: 'Close', disabled: false, loading: false }},
  stack: {{ back: 'back', title: 'pageLabel' }},
  states: ['placedTop', 'settled'],
  render: ({{ {given} }}) => (
{render}
  ),
}})"
    )
}

/// The nodes a render draws, as the builder form writes them.
fn tree(render: &str) -> Vec<Lit> {
    let read = headless_tsx(&source(
        "derived, entry, index, props, send, slots, stack, state",
        render,
    ))
    .unwrap_or_else(|why| panic!("{why}"));
    let Lit::Call(_, arguments) = read else {
        panic!("a call");
    };
    let Some(Lit::Object(body)) = arguments.get(1) else {
        panic!("an object");
    };
    match body.iter().find(|(key, _)| key == "render") {
        Some((_, Lit::Array(nodes))) => nodes.clone(),
        _ => panic!("a render"),
    }
}

fn refused(render: &str) -> String {
    headless_tsx(&source(
        "derived, entry, index, props, send, slots, stack, state",
        render,
    ))
    .unwrap_err()
}

fn text(value: &str) -> Lit {
    Lit::Text(value.to_owned())
}

fn call(helper: &str, arguments: Vec<Lit>) -> Lit {
    Lit::Call(helper.to_owned(), arguments)
}

fn object(fields: &[(&str, Lit)]) -> Lit {
    Lit::Object(
        fields
            .iter()
            .map(|(key, value)| ((*key).to_owned(), value.clone()))
            .collect(),
    )
}

fn bind(name: &str) -> Lit {
    call("bind", vec![text(name)])
}

#[test]
fn a_node_is_its_helper_with_its_part_as_its_name() {
    assert_eq!(
        tree(r#"<View part="track" ariaHidden icon="x" level={2} role="group" />"#),
        [call(
            "box",
            vec![
                text("track"),
                object(&[
                    ("decorative", Lit::Bool(true)),
                    ("glyph", text("x")),
                    ("level", Lit::Number(2.0)),
                    ("role", text("group")),
                ]),
                Lit::Array(Vec::new()),
            ],
        )]
    );
}

#[test]
fn a_read_binds_its_name_and_a_negation_is_not() {
    assert_eq!(
        tree(
            r#"<Pressable part="tab" selects label={props.dismissLabel} hidden={!props.disabled} hint={derived.holdHint} placed={state.placedTop} named={stack.title} offset={-1} onPress={send.beforeSelect} />"#
        ),
        [call(
            "pressable",
            vec![
                text("tab"),
                object(&[
                    ("chooses", Lit::Bool(true)),
                    ("label", bind("dismiss-label")),
                    ("hidden", call("not", vec![text("disabled")])),
                    ("hint", bind("hold-hint")),
                    ("placed", bind("placed-top")),
                    ("named", bind("page-label")),
                    ("offset", Lit::Number(-1.0)),
                    ("sends", text("before-select")),
                ]),
                Lit::Array(Vec::new()),
            ],
        )]
    );
}

#[test]
fn a_choice_of_strings_is_a_pick() {
    let [Lit::Call(_, arguments)]: [Lit; 1] = tree(
        r#"<Layer part="surface" anchorPress={derived.rows ? 'none' : 'toggle'} restoreFocus={!props.loading ? 'held' : 'always'} />"#,
    )
    .try_into()
    .unwrap() else {
        panic!("one node");
    };
    assert_eq!(
        arguments[1],
        object(&[
            (
                "presses",
                call(
                    "pick",
                    vec![
                        text("rows"),
                        object(&[("true", text("none"))]),
                        text("toggle")
                    ]
                )
            ),
            (
                "returns",
                call(
                    "pick",
                    vec![
                        text("loading"),
                        object(&[("true", text("always"))]),
                        text("held")
                    ]
                )
            ),
        ])
    );
}

#[test]
fn a_condition_is_a_when_and_a_negated_one_an_unless_nested_in_order() {
    let mark = || {
        call(
            "box",
            vec![text("mark"), object(&[]), Lit::Array(Vec::new())],
        )
    };
    assert_eq!(
        tree(
            r#"<>
  {props.loading && <View part="mark" />}
  {!props.loading && !derived.rows && <View part="mark" />}
  {state.settled ? <View part="mark" /> : <View part="mark" />}
  {/* A comment is no node. */}
</>"#
        ),
        [
            call("when", vec![text("loading"), mark()]),
            call(
                "unless",
                vec![text("loading"), call("unless", vec![text("rows"), mark()])]
            ),
            call("when", vec![text("settled"), mark()]),
            call("unless", vec![text("settled"), mark()]),
        ]
    );
}

#[test]
fn a_slot_is_a_region_named_for_its_slot_with_its_fallback() {
    assert_eq!(
        tree(
            r#"<>
  <Slot part="label" />
  <Slot name="icon"><View part="mark" /></Slot>
</>"#
        ),
        [
            call(
                "region",
                vec![
                    text("default"),
                    object(&[("part", text("label"))]),
                    Lit::Array(Vec::new())
                ]
            ),
            call(
                "region",
                vec![
                    text("icon"),
                    object(&[]),
                    Lit::Array(vec![call(
                        "box",
                        vec![text("mark"), object(&[]), Lit::Array(Vec::new())]
                    )]),
                ]
            ),
        ]
    );
}

#[test]
fn words_are_what_a_text_or_an_announcement_says() {
    assert_eq!(
        tree(
            r#"<>
  <Text part="title">{stack.title}</Text>
  <Text part="hint">Press here</Text>
  <Announce part="live" when={props.loading}>{props.dismissLabel}</Announce>
</>"#
        ),
        [
            call(
                "text",
                vec![text("title"), object(&[("says", bind("page-label"))])]
            ),
            call(
                "text",
                vec![text("hint"), object(&[("says", text("Press here"))])]
            ),
            call(
                "live",
                vec![
                    text("live"),
                    object(&[("while", bind("loading")), ("says", bind("dismiss-label"))])
                ]
            ),
        ]
    );
}

#[test]
fn a_wrap_a_repeat_and_a_vector_are_their_nodes() {
    assert_eq!(
        tree(
            r#"<Wrap part="link" when={props.loading}>
  <Repeat part="keys" each={derived.rows} key="at">
    <Text part="key">{entry.key}</Text>
    <View part="at" level={index} />
  </Repeat>
  <Svg part="ring" viewBox="0 0 10 10">
    <Path part="arc" d="M0 0" />
    <Circle part="dot" cx={5} cy={5} r={1} />
  </Svg>
</Wrap>"#
        ),
        [call(
            "wrap",
            vec![
                text("link"),
                object(&[("while", bind("loading"))]),
                Lit::Array(vec![
                    call(
                        "repeat",
                        vec![
                            text("keys"),
                            object(&[("each", bind("rows")), ("key", text("at"))]),
                            Lit::Array(vec![
                                call(
                                    "text",
                                    vec![
                                        text("key"),
                                        object(&[("says", call("field", vec![text("key")]))])
                                    ]
                                ),
                                call(
                                    "box",
                                    vec![
                                        text("at"),
                                        object(&[("level", call("index", Vec::new()))]),
                                        Lit::Array(Vec::new())
                                    ]
                                ),
                            ]),
                        ],
                    ),
                    call(
                        "box",
                        vec![
                            text("ring"),
                            object(&[("viewBox", text("0 0 10 10"))]),
                            Lit::Array(vec![
                                call(
                                    "box",
                                    vec![
                                        text("arc"),
                                        object(&[("d", text("M0 0")), ("shape", text("path"))]),
                                        Lit::Array(Vec::new())
                                    ]
                                ),
                                call(
                                    "box",
                                    vec![
                                        text("dot"),
                                        object(&[
                                            ("cx", Lit::Number(5.0)),
                                            ("cy", Lit::Number(5.0)),
                                            ("r", Lit::Number(1.0)),
                                            ("shape", text("circle")),
                                        ]),
                                        Lit::Array(Vec::new())
                                    ]
                                ),
                            ]),
                        ],
                    ),
                ]),
            ],
        )]
    );
}

#[test]
fn an_object_of_parts_takes_reads_and_flags() {
    let [Lit::Call(_, arguments)]: [Lit; 1] =
        tree(r#"<View part="row" also={{ "row-current": props.loading, quiet: true }} />"#)
            .try_into()
            .unwrap()
    else {
        panic!("one node");
    };
    assert_eq!(
        arguments[1],
        object(&[(
            "also",
            object(&[("row-current", bind("loading")), ("quiet", Lit::Bool(true))])
        )])
    );
}

/// Each refused form, and the words its refusal holds.
const REFUSED: &[(&str, &str)] = &[
    (
        r#"<div part="x" />"#,
        "`<div>` is an element of the page, which a render does not draw: write a node",
    ),
    (
        r#"<Box part="x" />"#,
        "`<Box>` is not a node: a render draws",
    ),
    (
        r#"<View part="x" {...props} />"#,
        "a spread of attributes: write each one",
    ),
    (
        r#"<View part="x">{...[]}</View>"#,
        "a spread of children: write each node",
    ),
    (
        r#"<View part="x" level={props.loading + 1} />"#,
        "an expression the compiler would have to run: write a literal",
    ),
    (
        r#"<View part="x" label={props.dismisLabel} />"#,
        "`props.dismisLabel` names no prop the source declares",
    ),
    (
        r#"<View part="x" label={derived.typo} />"#,
        "`derived.typo` names no computed value",
    ),
    (
        r#"<View part="x" label={state.typo} />"#,
        "`state.typo` names no state",
    ),
    (
        r#"<View part="x" label={stack.typo} />"#,
        "`stack.typo` names no value",
    ),
    (
        r#"<View part="x" label={send.dismiss} />"#,
        "`send.x` is what a press sends: write it as `onPress={send.x}`",
    ),
    (
        r#"<Pressable part="x" onPress={send.dismis} />"#,
        "`send.dismis` names no event the source declares",
    ),
    (
        r#"<Pressable part="x" onPress={props.loading} />"#,
        "`onPress` sends an event: write it as `onPress={send.x}`",
    ),
    (
        r#"<View part="x">Words</View>"#,
        "words in a node: write them as `<Text part=",
    ),
    (
        r#"<View part="x">{props.loading ? <View part="y" /> : null}</View>"#,
        "a condition draws one node",
    ),
    (
        r#"<View part="x">{props.loading || <View part="y" />}</View>"#,
        "a child is a node, `props.x && <Node />`",
    ),
    (
        r#"<View part="x">{props.loading && <><View part="y" /></>}</View>"#,
        "a condition draws one node",
    ),
    (
        r#"<View part="x" decorative />"#,
        "`decorative` is written `ariaHidden`",
    ),
    (
        r#"<View part="x" glyph="x" />"#,
        "`glyph` is written `icon`",
    ),
    (
        r#"<View part="x" viewBox="0 0 1 1" />"#,
        "a box that draws a vector is `<Svg viewBox=",
    ),
    (
        r#"<View part="x" shape="path" />"#,
        "a shape inside a vector is `<Path>`",
    ),
    (
        r#"<View role="group" />"#,
        "`<View>` names the part it is with `part=\"...\"`",
    ),
    (
        r"<View part={props.dismissLabel} />",
        "`part` is a name written as a string",
    ),
    (
        r#"<View part="x" label={`words`} />"#,
        "an expression the compiler would have to run",
    ),
    (
        r#"<View part="x" label={entry.key ? 'a' : 'b'} />"#,
        "a condition reads a prop, a computed value, or a state",
    ),
    (
        r#"<View part="x" label={props.loading ? 'a' : 1} />"#,
        "a choice of values picks between strings",
    ),
    (
        r#"<Image part="x"><View part="y" /></Image>"#,
        "`<Image>` holds no nodes",
    ),
    (
        r#"<Text part="x">{props.loading}{props.disabled}</Text>"#,
        "words are one read or one string",
    ),
    (
        r#"<Svg part="x" />"#,
        "`<Svg>` takes the `viewBox` it draws in",
    ),
    (
        r#"<View part="x" ns:a="b" />"#,
        "an attribute's name is one name",
    ),
    (r"props.loading", "`render` returns a node"),
];

/// Each refused form names its line and the form to write.
#[test]
fn every_form_outside_the_grammar_is_refused_with_its_line_and_the_form_to_write() {
    for (render, says) in REFUSED {
        let why = refused(render);
        assert!(why.contains(*says), "{render}: {why}");
        assert!(
            why.starts_with("line 9:") || why.starts_with("line 10:"),
            "{render}: {why}"
        );
    }
}

#[test]
fn render_is_given_only_what_it_reads_by_its_own_name() {
    let unknown = headless_tsx(&source("props, other", "<View part=\"x\" />")).unwrap_err();
    assert!(
        unknown.contains("`render` is given copy, countdown, delay, derived, entry"),
        "{unknown}"
    );
    let missing =
        headless_tsx(&source("props", "<View part=\"x\" label={derived.rows} />")).unwrap_err();
    assert!(
        missing.contains("`derived` is not something `render` is given: write `({ derived }) =>`"),
        "{missing}"
    );
}

#[test]
fn a_wrap_with_no_condition_always_wraps_and_a_link_wraps_what_it_links() {
    assert_eq!(
        tree(r#"<Wrap part="trigger" platform="native"><Slot name="trigger" /></Wrap>"#),
        [call(
            "wrap",
            vec![
                text("trigger"),
                object(&[("platform", text("native")), ("while", Lit::Bool(true))]),
                Lit::Array(vec![call(
                    "region",
                    vec![text("trigger"), object(&[]), Lit::Array(Vec::new())]
                )]),
            ],
        )]
    );
    assert_eq!(
        tree(r#"<Wrap part="link" href={props.dismissLabel}><Slot /></Wrap>"#),
        [call(
            "wrap",
            vec![
                text("link"),
                object(&[("href", bind("dismiss-label"))]),
                Lit::Array(vec![call(
                    "region",
                    vec![text("default"), object(&[]), Lit::Array(Vec::new())]
                )]),
            ],
        )]
    );
    for always in [
        r#"<Wrap part="a" when><Slot /></Wrap>"#,
        r#"<Wrap part="a" when={true}><Slot /></Wrap>"#,
    ] {
        let why = refused(always);
        assert!(
            why.contains("a wrap that always wraps writes no `when`"),
            "{why}"
        );
    }
}

/// The one attribute object a single `<View>` takes.
fn attributes_of(render: &str) -> Lit {
    let [Lit::Call(_, arguments)]: [Lit; 1] = tree(render).try_into().unwrap() else {
        panic!("one node");
    };
    arguments[1].clone()
}

#[test]
fn a_test_of_a_value_is_a_pick_by_that_value() {
    assert_eq!(
        attributes_of(
            r#"<View part="x" role={props.dismissLabel === 'a' ? 'b' : props.dismissLabel === 'c' ? 'd' : 'e'} />"#
        ),
        object(&[(
            "role",
            call(
                "pick",
                vec![
                    text("dismiss-label"),
                    object(&[("a", text("b")), ("c", text("d"))]),
                    text("e"),
                ],
            ),
        )])
    );
    assert_eq!(
        attributes_of(r#"<View part="x" role={state.settled === false ? 'img' : ''} />"#),
        object(&[(
            "role",
            call(
                "pick",
                vec![text("settled"), object(&[("false", text("img"))]), text("")],
            ),
        )])
    );
    let other = refused(
        r#"<View part="x" role={props.loading === 'a' ? 'b' : props.disabled === 'c' ? 'd' : 'e'} />"#,
    );
    assert!(other.contains("tests one read"), "{other}");
}

#[test]
fn a_feature_value_is_read_by_the_feature_and_its_field() {
    let read = headless_tsx(
        "export default headless('x', {
  stop: { back: 'b', counted: 'counted', current: 'u', first: 'f', last: 'l', name: 'name', next: 'x', onAsk: 'a', place: 'place', reach: 'r', said: 's', shown: 'h', skip: 'k', target: 't', words: 'words' },
  total: { holds: 'segmented', itemProp: 'p', of: 'o', prop: 'i' },
  render: ({ stop, total }) => (
    <View part=\"x\" label={stop.name}>
      {total.holds && <Text part=\"w\">{stop.words.back}</Text>}
    </View>
  ),
})",
    )
    .unwrap();
    let Lit::Call(_, arguments) = read else {
        panic!("a call");
    };
    let Some(Lit::Object(body)) = arguments.get(1) else {
        panic!("an object");
    };
    let (_, render) = body.iter().find(|(key, _)| key == "render").unwrap();
    assert_eq!(
        render,
        &Lit::Array(vec![call(
            "box",
            vec![
                text("x"),
                object(&[("label", bind("name"))]),
                Lit::Array(vec![call(
                    "when",
                    vec![
                        text("segmented"),
                        call(
                            "text",
                            vec![text("w"), object(&[("says", bind("back-words"))])]
                        ),
                    ]
                )]),
            ],
        )])
    );
    let unknown = headless_tsx(
        "export default headless('x', {
  total: { holds: 'segmented', itemProp: 'p', of: 'o', prop: 'i' },
  render: ({ total }) => <View part=\"x\" label={total.into} />,
})",
    )
    .unwrap_err();
    assert!(
        unknown.contains("`total.into` names no value the source's `total` computes: total.holds"),
        "{unknown}"
    );
}

#[test]
fn whether_a_slot_holds_something_is_read_by_a_wrap_and_a_hidden_view() {
    assert_eq!(
        tree(
            r#"<>
  <Wrap part="row" when={slots.headerActions}><Slot name="header-actions" /></Wrap>
  <View part="d" hidden={!slots.default}><Slot /></View>
</>"#
        ),
        [
            call(
                "wrap",
                vec![
                    text("row"),
                    object(&[("while", bind("header-actions"))]),
                    Lit::Array(vec![call(
                        "region",
                        vec![text("header-actions"), object(&[]), Lit::Array(Vec::new())]
                    )]),
                ],
            ),
            call(
                "box",
                vec![
                    text("d"),
                    object(&[("hidden", call("not", vec![text("default")]))]),
                    Lit::Array(vec![call(
                        "region",
                        vec![text("default"), object(&[]), Lit::Array(Vec::new())]
                    )]),
                ],
            ),
        ]
    );
    let elsewhere = refused(r#"<View part="d" label={slots.default} />"#);
    assert!(
        elsewhere.contains("`slots.x` is read by a `<Wrap when>` and a `<View hidden>`"),
        "{elsewhere}"
    );
}

#[test]
fn a_derivation_and_a_custom_property_are_written_in_place() {
    assert_eq!(
        tree(
            r#"<View part="k" label={derive('kbd-label')} style={{ '--meter-at': derived.holdHint, '--meter-span': 2 }}>
  <Text part="w">{derive('kbd-says')}</Text>
</View>"#
        ),
        [call(
            "box",
            vec![
                text("k"),
                object(&[
                    ("label", call("derive", vec![text("kbd-label")])),
                    ("--meter-at", bind("hold-hint")),
                    ("--meter-span", Lit::Number(2.0)),
                ]),
                Lit::Array(vec![call(
                    "text",
                    vec![
                        text("w"),
                        object(&[("says", call("derive", vec![text("kbd-says")]))])
                    ]
                )]),
            ],
        )]
    );
    let property = refused(r#"<View part="k" style={{ color: 'red' }} />"#);
    assert!(
        property.contains("is not a CSS custom property"),
        "{property}"
    );
    let call_of = refused(r#"<View part="k" label={format('x')} />"#);
    assert!(
        call_of.contains("a call the compiler would have to run"),
        "{call_of}"
    );
}

#[test]
fn a_text_input_is_a_field_with_the_web_s_words() {
    assert_eq!(
        tree(
            r#"<TextInput autoComplete="email" autoGrow={props.loading} enterKeyHint="send" maxRows={4} multiline part="control" rows={3} />"#
        ),
        [call(
            "field",
            vec![
                text("control"),
                object(&[
                    ("autocomplete", text("email")),
                    ("grows", bind("loading")),
                    ("enterkeyhint", text("send")),
                    ("maxrows", Lit::Number(4.0)),
                    ("multiline", Lit::Bool(true)),
                    ("rows", Lit::Number(3.0)),
                ]),
            ],
        )]
    );
}

#[test]
fn a_field_holds_no_nodes_and_takes_its_words_by_react_s_names() {
    assert!(
        refused(r#"<TextInput part="control"><View part="x" /></TextInput>"#)
            .contains("`<TextInput>` holds no nodes")
    );
    assert!(
        refused(r#"<TextInput autocomplete="email" part="control" />"#)
            .contains("`autocomplete` is written `autoComplete`")
    );
}
