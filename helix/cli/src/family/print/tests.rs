use super::headless;

/// A builder-form source with a comment in each place one may stand.
const SOURCE: &str = "import { bind, box, derive, event, headless, item, live, not, pick, pressable, prop, region, text, total, unless, when, wrap } from '../../../tree.js'

/**
 * A row's headless tier.
 */
export default headless('row', {
  derived: {
    /* What the row says. */
    'row-words': derive('menu-hold-hint'),
  },
  events: [
    event('select', { detail: ['value'] }),
    event('before-select', { cancelable: true, detail: ['value'] }),
    event('change', { bare: true }),
    event('filter', { detail: ['value'], platform: 'web' }),
  ],
  item: item('rows', { chooses: true, state: 'chosen' }),
  props: [
    prop('value', 'string', { default: '' }),
    /* A link's, for a row that goes somewhere. */
    prop('href', 'string', { platform: 'web' }),
    prop('target', 'string', { platform: 'web' }),
    prop('disabled', 'boolean', { default: false }),
    prop('count', 'number | string', { default: '' }),
    prop('kind', ['plain', 'raised'], { default: 'plain' }),
    prop('expanded', 'boolean', { attribute: false }),
  ],
  states: ['chosen', 'placed-top'],
  total: total({ holds: 'holding', into: 'count', of: 'row-item', prop: 'value' }),
  tree: [
    /* The row itself. */
    box(
      'row',
      {
        also: { 'row-top': bind('placed-top') },
        /* Out of a screen reader's way. */
        decorative: true,
        role: pick('kind', { raised: 'group' }, 'presentation'),
        '--row-count': bind('count'),
      },
      [
        region('default', { part: 'label' }),
        pressable('press', { chooses: true }, []),
        when('disabled', box('mark', { glyph: 'x' })),
        unless('disabled', text('words', { says: bind('row-words') })),
        when('holding', unless('expanded', box('held'))),
        wrap('aside', { while: bind('aside') }, [region('aside')]),
        box('more', { hidden: not('more') }, [region('more')]),
      ],
    ),
    live('live', { says: 'Moved', while: bind('chosen') }),
  ],
})
";

#[test]
fn a_builder_source_prints_as_jsx_with_every_comment_where_it_stood() {
    let printed = headless(SOURCE).unwrap();
    let text = printed.text;
    for expected in [
        "import { Announce, bare, boolean, cancelable, headless, numberOrString, oneOf, Pressable, property, set, Slot, string, Text, View, web, Wrap } from '../../../render.js'\nimport { derive, total } from '../../../tree.js'\n",
        "/**\n * A row's headless tier.\n */\nexport default headless('row', {",
        "  memberOf: set('rows', { state: 'chosen' }),",
        "    count: numberOrString(''),\n    disabled: false,\n    expanded: property(boolean()),\n    /* A link's, for a row that goes somewhere. */\n    href: web(string()),\n    kind: oneOf(['plain', 'raised'], 'plain'),\n    target: web(string()),\n    value: '',",
        "    beforeSelect: cancelable(['value']),\n    change: bare(),\n    filter: web(['value']),\n    select: ['value'],",
        "    /* What the row says. */\n    rowWords: derive('menu-hold-hint'),",
        "  total: total({ holds: 'holding', into: 'count', of: 'row-item', prop: 'value' }),",
        "      {/* The row itself. */}\n      <View\n        also={{ 'row-top': state.placedTop }}\n        /* Out of a screen reader's way. */\n        ariaHidden\n        part=\"row\"",
        "        <Pressable\n          chooses\n          part=\"press\"\n        />",
        "        role={props.kind === 'raised' ? 'group' : 'presentation'}",
        "        style={{\n          '--row-count': props.count,\n        }}",
        "        {props.disabled ? (",
        "        {total.holds && !props.expanded && (",
        "        <Wrap\n          part=\"aside\"\n          when={slots.aside}\n        >",
        "          hidden={!slots.more}",
        "        {'Moved'}",
    ] {
        assert!(text.contains(expected), "{expected}\n---\n{text}");
    }
    assert_eq!(
        printed.notes,
        ["row: the comment above `href` in `props` stood above `href`, `target`, `disabled`, `count`, `kind`, `expanded`, which no longer stand together"]
    );
}

#[test]
fn a_comment_with_no_place_in_the_jsx_form_is_refused_with_its_line() {
    let inside = SOURCE.replace(
        "prop('kind', ['plain', 'raised'], { default: 'plain' }),",
        "prop('kind', ['plain', /* flat */ 'raised'], { default: 'plain' }),",
    );
    let why = headless(&inside).unwrap_err();
    assert!(
        why.starts_with("line 25: a comment inside one of `props`"),
        "{why}"
    );
}

#[test]
fn a_value_the_jsx_form_cannot_say_is_refused() {
    let unread = SOURCE.replace("bind('row-words')", "bind('nothing')");
    let why = headless(&unread).unwrap_err();
    assert!(why.contains("reads `nothing`"), "{why}");
}
