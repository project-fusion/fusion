//! The spellings the header's defaults, `first()`, `ownOf()`, the platform
//! groups, a set's `web` block, and the one condition namespace add, each
//! held to the intermediate form the older spelling compiles to.

use super::*;
use crate::family::api::headless;
use crate::family::ir::styled;
use crate::family::read::default_export;

/// A table with its header and its rules function, as written.
fn table(header: &str, rules: &str) -> String {
    format!(
        "import b from './headless.js'\nexport default styles(b, {{ prefix: 'button', stylesheet: 's.css', {header} }}, {rules})"
    )
}

/// What a table compiles to, over a source written with `render` or none.
fn compiled(source: &str, over: Option<&Source>) -> Result<String, String> {
    let lit = desugar_with(&default_export(source)?, over)?;
    let family = styled(&lit)?;
    Ok(serde_json::to_string(&family.rules).unwrap())
}

fn ir(source: &str) -> String {
    compiled(source, None).unwrap_or_else(|why| panic!("{why}"))
}

fn refused(source: &str, over: Option<&Source>) -> String {
    compiled(source, over).unwrap_err()
}

#[test]
fn first_is_the_chain_of_fallbacks_read_left_to_right() {
    assert_eq!(
        ir(&table(
            "hooks: ['radius', 'radius-end'], own: ['button-edge']",
            "({ hook, on, own, rule }) => [on('host', [rule({
              borderRadius: first(hook.radiusEnd, hook.radius, own.edge, hookOf('group', 'radius'), ownOf('tabs', 'rest'), inherited('list-gap'), measured('width'), 0),
            })])]",
        )),
        ir(&table(
            "hooks: ['radius', 'radius-end'], own: ['button-edge']",
            "({ hook, on, own, rule }) => [on('host', [rule({
              borderRadius: hook.radiusEnd(hook.radius(own.edge(hookOf('group', 'radius', own.tabsRest(inherited('list-gap', measured('width', 0))))))),
            })])]",
        ).replace("own: ['button-edge']", "own: ['button-edge', 'tabs-rest']")),
    );
    for (written, says) in [
        (
            "first(token('a'), 1)",
            "`first()` takes reads and then a fallback",
        ),
        (
            "first(hook.radius(1), 2)",
            "`first()` takes reads and then a fallback",
        ),
        (
            "first(hookOf('group', 'radius', 1), 2)",
            "`first()` takes reads and then a fallback",
        ),
        ("first(1)", "`first()` takes reads and then a fallback"),
    ] {
        let why = refused(
            &table(
                "hooks: ['radius']",
                &format!("({{ hook, on, rule }}) => [on('host', [rule({{ opacity: hook.radius, margin: {written} }})])]"),
            ),
            None,
        );
        assert!(why.contains(says), "{written}: {why}");
    }
}

#[test]
fn the_header_gives_each_hook_and_private_value_its_default_once() {
    assert_eq!(
        ir(&table(
            "hooks: ({ own }) => ({ color: token('ink'), radius: first(own.r, 0), size: null }), own: { j: 'center', r: null }",
            "({ hook, on, own, rule }) => [on('host', [rule({
              color: hook.color,
              borderRadius: hook.radius,
              blockSize: hook.size('1em'),
              justifyContent: own.j,
              inlineSize: hook.color('red'),
            })])]",
        )),
        ir(&table(
            "hooks: ['color', 'radius', 'size'], own: ['j', 'r']",
            "({ hook, on, own, rule }) => [on('host', [rule({
              color: hook.color(token('ink')),
              borderRadius: hook.radius(own.r(0)),
              blockSize: hook.size('1em'),
              justifyContent: own.j('center'),
              inlineSize: hook.color('red'),
            })])]",
        )),
    );
}

#[test]
fn a_fallback_that_repeats_the_default_and_a_default_that_reads_itself_are_refused() {
    compiled(
        &table(
            "hooks: { color: token('ink'), size: null }",
            "({ hook, on, rule }) => [on('host', [rule({ color: hook.color, outlineColor: hook.color('red'), blockSize: hook.size(1), inlineSize: hook.size(1) })])]",
        ),
        None,
    )
    .unwrap();
    for read in [
        "hook.color(token('ink'))",
        "first(hook.color, token('ink'))",
    ] {
        let repeated = refused(
            &table(
                "hooks: { color: token('ink') }",
                &format!("({{ hook, on, rule }}) => [on('host', [rule({{ color: {read} }})])]"),
            ),
            None,
        );
        assert!(
            repeated.contains(
                "`hook.color(…)` repeats the default `hooks` gives it: write `hook.color`"
            ),
            "{repeated}"
        );
    }
    let own = refused(
        &table(
            "own: { buttonInk: 'red' }",
            "({ on, own, rule }) => [on('host', [rule({ color: own.buttonInk('red') })])]",
        ),
        None,
    );
    assert!(own.contains("write `own.buttonInk`"), "{own}");
    let itself = refused(
        &table(
            "hooks: ({ own }) => ({ color: own.ink }), own: { ink: own.ink }",
            "({ hook, on, rule }) => [on('host', [rule({ color: hook.color })])]",
        ),
        None,
    );
    assert!(
        itself.contains("the default of `ink` reads itself"),
        "{itself}"
    );
    let null = refused(
        &table(
            "hooks: ({ own }) => ({ color: own.ink }), own: { ink: 'red' }",
            "({ hook, on, rule }) => [on('host', [rule({ color: hook.color, margin: null })])]",
        ),
        None,
    );
    assert!(
        null.contains("`null` is a default in the header alone"),
        "{null}"
    );
    let kebab = refused(&table("hooks: { 'font-size': 1 }", "({ on }) => []"), None);
    assert!(
        kebab.contains("names `font-size` in camelCase, as `fontSize`"),
        "{kebab}"
    );
}

#[test]
fn own_of_reads_another_familys_private_value() {
    assert_eq!(
        ir(&table(
            "",
            "({ on, rule }) => [on('host', [rule({ opacity: ownOf('tabs', 'dismiss-rest', 1) })])]",
        )),
        ir(&table(
            "own: ['tabs-dismiss-rest']",
            "({ on, own, rule }) => [on('host', [rule({ opacity: own.tabsDismissRest(1) })])]",
        )),
    );
    let wrong = refused(
        &table(
            "",
            "({ on, rule }) => [on('host', [rule({ opacity: ownOf('tabs') })])]",
        ),
        None,
    );
    assert!(
        wrong.contains("`ownOf()` takes a family's prefix"),
        "{wrong}"
    );
}

#[test]
fn a_sets_web_block_is_each_declaration_where_it_stands() {
    assert_eq!(
        ir(&table(
            "",
            "({ on, rule }) => [on('host', [rule({ color: 'red', web: { cursor: 'pointer', font: 'inherit' }, opacity: 1 })])]",
        )),
        ir(&table(
            "",
            "({ on, rule }) => [on('host', [rule({ color: 'red', cursor: web('pointer'), font: web('inherit'), opacity: 1 })])]",
        )),
    );
    let order = refused(
        &table(
            "",
            "({ on, rule }) => [on('host', [rule({ color: 'red', web: { all: 'unset' } })])]",
        ),
        None,
    );
    assert!(order.contains("`all` comes first"), "{order}");
}

#[test]
fn a_platforms_group_says_its_platform_of_each_rule_inside() {
    assert_eq!(
        ir(&table(
            "props: { tone: oneOf(['a', 'b']) }",
            "({ on, rule, variants }) => [on('host', [
              web([rule({ hover: true }, { opacity: 1 }), rule({ supports: '(x: y)' }, { opacity: 0 })]),
              native([variants('tone', { a: { opacity: 1 } })]),
            ])]",
        )),
        ir(&table(
            "props: { tone: oneOf(['a', 'b']) }",
            "({ on, rule }) => [on('host', [
              rule({ hover: true, platform: 'web' }, { opacity: 1 }),
              rule({ platform: 'web', supports: '(x: y)' }, { opacity: 0 }),
              rule({ platform: 'native', tone: 'a' }, { opacity: 1 }),
            ])]",
        )),
    );
    let own = refused(
        &table(
            "",
            "({ on, rule }) => [on('host', [web([rule({ platform: 'web' }, { opacity: 1 })])])]",
        ),
        None,
    );
    assert!(
        own.contains("inside `web([...])` says no `platform` of its own"),
        "{own}"
    );
    let nested = refused(
        &table(
            "",
            "({ on, rule }) => [on('host', [web([native([rule({ opacity: 1 })])])])]",
        ),
        None,
    );
    assert!(
        nested.contains("inside another platform's group"),
        "{nested}"
    );
    for rule in [
        "web([rule({ web: { cursor: 'pointer' } })])",
        "web([rule({ cursor: web('pointer') })])",
        "rule({ platform: 'web' }, { web: { cursor: 'pointer' } })",
    ] {
        let said = refused(
            &table("", &format!("({{ on, rule }}) => [on('host', [{rule}])]")),
            None,
        );
        assert!(
            said.contains("inside a rule that is the web's alone says nothing"),
            "{said}"
        );
    }
    /* A phone's own rule may spread a set both platforms read. */
    ir(&table(
        "",
        "({ on, rule }) => [on('host', [native([rule({ cursor: web('pointer'), opacity: 1 })])])]",
    ));
}

#[test]
fn within_the_host_an_array_is_any_of_and_form_disabled_is_the_hosts_own() {
    assert_eq!(
        ir(&table(
            "",
            "({ on, rule }) => [on('button', [rule({ within: { host: ['hover', 'focusWithin'] } }, { opacity: 1 })])]",
        )),
        ir(&table(
            "",
            "({ on, rule }) => [on('button', [rule([{ within: { host: { hover: true } } }, { within: { host: { focusWithin: true } } }], { opacity: 1 })])]",
        )),
    );
    assert_eq!(
        ir(&table(
            "",
            "({ on, rule }) => [on('button', [rule({ formDisabled: false, within: { text: { hover: true } } }, { opacity: 1 })])]",
        )),
        ir(&table(
            "",
            "({ on, rule }) => [on('button', [rule({ disabled: false, within: { text: { hover: true } } }, { opacity: 1 })])]",
        )),
    );
    let old = refused(
        &table(
            "",
            "({ on, rule }) => [on('button', [rule({ within: { host: { disabled: false } } }, { opacity: 1 })])]",
        ),
        None,
    );
    assert!(old.contains("is written `formDisabled`"), "{old}");
}

/// A tab's source: a press that carries `disabled` bound to the prop, a
/// `selected` that is a prop and a state, and a mark that is hidden while a
/// state holds.
fn tab() -> Source {
    Source::of(
        &headless(
            &default_export(
                "export default headless('tab', {
                  props: [prop('disabled', 'boolean'), prop('selected', 'boolean'), prop('busy', 'boolean'), prop('variant', ['a', 'b'])],
                  states: ['selected', 'quiet'],
                  tree: [pressable('tab', { disabled: bind('disabled') }, [
                    box('mark', { hidden: bind('quiet') }),
                    pressable('close', { disabled: bind('busy') }, []),
                  ])],
                })",
            )
            .unwrap(),
        )
        .unwrap(),
    )
}

#[test]
fn a_name_alone_resolves_to_the_parts_attribute_a_state_or_a_prop() {
    let source = tab();
    let resolved = |rules: &str| {
        compiled(&table("", rules), Some(&source)).unwrap_or_else(|why| panic!("{why}"))
    };
    assert_eq!(
        resolved("({ on, rule }) => [on('tab', [rule({ hover: true, disabled: false }, { opacity: 1 })])]"),
        ir(&table("", "({ on, rule }) => [on('tab', [rule({ hover: true, part: { disabled: false } }, { opacity: 1 })])]")),
    );
    let states =
        resolved("({ on, rule }) => [on('tab', [rule([{ selected: true }, { hover: true, selected: false }], { opacity: 1 })])]");
    assert!(
        states.contains(r#"{"kind":"state","name":"selected"}"#),
        "{states}"
    );
    assert!(
        states.contains(r#"{"kind":"not","condition":{"kind":"state","name":"selected"}}"#),
        "{states}"
    );
    let old = refused(
        &table(
            "",
            "({ on, rule }) => [on('tab', [rule({ state: 'selected' }, { opacity: 1 })])]",
        ),
        Some(&source),
    );
    assert!(
        old.contains("`state: ...` is written as each state's name alone"),
        "{old}"
    );
    assert_eq!(
        resolved("({ on, rule }) => [on('host', [rule({ variant: 'a', disabled: true }, { opacity: 1 })])]"),
        ir(&table("", "({ on, rule }) => [on('host', [rule({ variant: 'a', has: 'disabled' }, { opacity: 1 })])]")),
    );
    /* With no source, a name alone keeps the older meaning, the prop. */
    assert_eq!(
        ir(&table(
            "",
            "({ on, rule }) => [on('tab', [rule({ selected: true }, { opacity: 1 })])]"
        )),
        ir(&table(
            "",
            "({ on, rule }) => [on('tab', [rule({ has: 'selected' }, { opacity: 1 })])]"
        )),
    );
}

#[test]
fn a_name_that_resolves_to_two_things_or_none_is_refused() {
    let source = tab();
    for (rules, says) in [
        (
            "on('close', [rule({ disabled: true }, { opacity: 1 })])",
            "`disabled` is an attribute of `close` and a prop it is not bound to",
        ),
        (
            "on('tab', [rule({ typo: true }, { opacity: 1 })])",
            "`typo` in `when` names no prop, state, or attribute",
        ),
        (
            "on('tab', [rule({ selected: 'yes' }, { opacity: 1 })])",
            "`selected` is a state, which is `true` or `false`",
        ),
    ] {
        let why = refused(
            &table("", &format!("({{ on, rule }}) => [{rules}]")),
            Some(&source),
        );
        assert!(why.contains(says), "{rules}: {why}");
    }
    let both = Source::of(
        &headless(
            &default_export(
                "export default headless('x', { states: ['hidden'], tree: [box('mark', { hidden: true })] })",
            )
            .unwrap(),
        )
        .unwrap(),
    );
    let state = compiled(
        &table(
            "",
            "({ on, rule }) => [on('mark', [rule({ hidden: true }, { opacity: 1 })])]",
        ),
        Some(&both),
    )
    .unwrap();
    assert!(
        state.contains(r#"{"kind":"state","name":"hidden"}"#),
        "{state}"
    );
    let attribute = compiled(
        &table(
            "",
            "({ on, rule }) => [on('mark', [rule({ part: { hidden: true } }, { opacity: 1 })])]",
        ),
        Some(&both),
    )
    .unwrap();
    assert!(!attribute.contains(r#""kind":"state""#), "{attribute}");
}
