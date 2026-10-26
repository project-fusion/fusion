use super::{is_rendered, rewrite};
use crate::family::api::headless;
use crate::family::read::{default_export, headless_tsx};

/// The intermediate form's API and tree of a source, as JSON.
fn compiled(read: &crate::family::api::Headless) -> String {
    format!(
        "{}\n{}",
        serde_json::to_string(&read.api).unwrap(),
        serde_json::to_string(&read.tree).unwrap()
    )
}

fn rendered(source: &str) -> Result<crate::family::api::Headless, String> {
    let export = headless_tsx(source)?;
    assert!(is_rendered(&export));
    headless(&rewrite(&export)?)
}

#[test]
fn a_source_written_with_render_compiles_to_what_the_builder_form_does() {
    let builder = headless(
        &default_export(
            "export default headless('tab', {
              events: [
                event('dismiss', { cancelable: true, detail: ['label'] }),
                event('before-select', { cancelable: true, detail: ['value'] }),
                event('change', { bare: true }),
                event('filter', { detail: ['value'], platform: 'web' }),
              ],
              derived: { 'hold-hint': derive('menu-hold-hint') },
              item: item('tabs', { chooses: true, state: 'selected' }),
              props: [
                prop('disabled', 'boolean', { default: false }),
                prop('dismiss-label', 'string', { default: 'Close' }),
                prop('offset', 'number', { default: 4 }),
                prop('href', 'string'),
                prop('expanded', 'boolean', { attribute: false }),
                prop('open-on', ['click', 'long-press'], { default: 'click' }),
                prop('rel', 'string', { platform: 'web' }),
                prop('name', 'string', { default: '', platform: 'web' }),
              ],
              states: ['selected'],
              tree: [
                pressable('tab', { chooses: true, disabled: bind('disabled'), sends: 'before-select' }, [
                  region('default', { part: 'label' }),
                  when('disabled', box('mark', { decorative: true, glyph: 'x' })),
                  unless('disabled', text('hint', { says: bind('hold-hint') })),
                ]),
                live('live', { says: bind('dismiss-label'), while: bind('disabled') }),
              ],
            })",
        )
        .unwrap(),
    )
    .unwrap();
    let written = rendered(
        "export default headless('tab', {
          memberOf: set('tabs', { state: 'selected' }),
          derived: { holdHint: derive('menu-hold-hint') },
          props: {
            disabled: false,
            dismissLabel: 'Close',
            offset: 4,
            href: string(),
            expanded: property(boolean()),
            openOn: oneOf(['click', 'long-press'], 'click'),
            rel: web(string()),
            name: web(''),
          },
          events: {
            dismiss: cancelable(['label']),
            beforeSelect: cancelable(['value']),
            change: bare(),
            filter: web(['value']),
          },
          states: ['selected'],
          render: ({ derived, props, send }) => (
            <>
              <Pressable part=\"tab\" chooses disabled={props.disabled} onPress={send.beforeSelect}>
                <Slot part=\"label\" />
                {props.disabled ? <View part=\"mark\" ariaHidden icon=\"x\" /> : <Text part=\"hint\">{derived.holdHint}</Text>}
              </Pressable>
              <Announce part=\"live\" when={props.disabled}>{props.dismissLabel}</Announce>
            </>
          ),
        })",
    )
    .unwrap();
    assert_eq!(compiled(&written), compiled(&builder));
}

#[test]
fn render_comes_last_and_the_builder_keys_are_refused() {
    let last =
        rendered("export default headless('x', { render: () => <View part=\"x\" />, states: [] })")
            .unwrap_err();
    assert!(last.contains("`render` comes last"), "{last}");
    let item = rendered(
        "export default headless('x', { item: item('y'), render: () => <View part=\"x\" /> })",
    )
    .unwrap_err();
    assert!(item.contains("writes `memberOf: set(...)`"), "{item}");
    let kebab = rendered(
        "export default headless('x', { props: { 'dismiss-label': '' }, render: () => <View part=\"x\" /> })",
    )
    .unwrap_err();
    assert!(
        kebab.contains("is named in camelCase, as `dismissLabel`"),
        "{kebab}"
    );
    for key in ["chooses", "pressChooses"] {
        let chooses = rendered(&format!(
            "export default headless('x', {{ memberOf: set('y', {{ {key}: true }}), render: () => <View part=\"x\" /> }})"
        ))
        .unwrap_err();
        assert!(
            chooses.contains(&format!(
                "`set()` takes no `{key}`: pressing chooses where a `<Pressable>`"
            )),
            "{chooses}"
        );
    }
    let spec = rendered(
        "export default headless('x', { props: { a: [1] }, render: () => <View part=\"x\" /> })",
    )
    .unwrap_err();
    assert!(spec.contains("prop `a` is a default"), "{spec}");
}

#[test]
fn a_member_chooses_where_its_press_says_chooses_and_only_there() {
    let item = |render: &str| {
        let read = rendered(&format!(
            "export default headless('x', {{ memberOf: set('y'), render: () => (\n{render}\n) }})"
        ))
        .unwrap();
        serde_json::to_string(&read.api.item).unwrap()
    };
    assert_eq!(
        item(r#"<View part="row"><Pressable part="press" chooses /></View>"#),
        r#"{"chooses":true,"of":"y"}"#
    );
    assert_eq!(item(r#"<Pressable part="press" />"#), r#"{"of":"y"}"#);
}
