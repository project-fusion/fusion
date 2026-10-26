import {
  bind,
  box,
  derive,
  event,
  headless,
  item,
  not,
  pick,
  pressable,
  prop,
  region,
  unless,
  when,
  wrap,
} from '../../../tree.js'

/**
 * A menu row's headless tier: a command, a choice that turns on and off, or
 * one of a run of choices, which a press chooses, follows its link, or
 * opens a page of its own.
 *
 * **A press asks with `before-select`** and the row's `value`, which a
 * handler may refuse, then says `select`, and the menu closes once it stands, unless the row's
 * `close-on-select` is false. A row with an `href` follows its link once
 * the event stands: on the web the browser follows it, and on a phone the
 * app's open-link. `disabled` keeps it from being chosen.
 *
 * **`checkable` makes the row a choice**, which a press turns over, and
 * `exclusive` one of a run of choices next to each other, which a press
 * turns on and the rest of the run off. `checked` is the state it starts
 * in. Each turn asks `before-check` first, with the `checked` it asks for,
 * which a handler may refuse. A checked row draws a check at its end.
 *
 * **A row whose `submenu` holds rows opens that page**, and its caret says
 * so. The row is named by its label alone. The words passed into
 * `description`, a line under the label, and into `end` describe it, a
 * phone's hint, as the web's `aria-describedby` reads them. `shortcut`
 * shows a keyboard shortcut after the label, in the reader's keyboard's
 * glyphs, and binds nothing. What is passed into `start` stands before the
 * label, and into `check` and `chevron` replaces the mark.
 *
 * **The web's**: `rel`, `target`, `download`, `aria-keyshortcuts`, and the
 * panel a row's page flies out in under the menu's `submenus="flyout"`,
 * which a phone drills into in place.
 *
 * **Held to `helix-menu-item`.** `helix family check` compares the props,
 * the events, the regions, and the parts with what the manifest says the
 * element has.
 */
export default headless('menu-item', {
  derived: {
    described: bind('description'),
    ends: derive('menu-item-ends'),
    'has-submenu': bind('submenu'),
    role: derive('menu-item-role'),
    started: bind('start'),
    'submenu-marked': derive('menu-item-submenu-mark'),
    'submenu-started': derive('menu-item-submenu-start'),
  },
  events: [
    event('before-check', { cancelable: true, detail: ['checked'] }),
    event('before-select', { cancelable: true, detail: ['value'] }),
    event('select', { detail: ['value'] }),
  ],
  item: item('menu', {
    before: 'before-check',
    checkable: 'checkable',
    checked: 'checked',
    chooses: true,
    closes: 'close-on-select',
    exclusive: 'exclusive',
    page: 'submenu',
  }),
  props: [
    prop('checkable', 'boolean', { default: false }),
    prop('checked', 'boolean', { default: false }),
    prop('close-on-select', 'boolean'),
    prop('disabled', 'boolean', { default: false }),
    prop('exclusive', 'boolean', { default: false }),
    prop('href', 'string', { default: '' }),
    prop('shortcut', 'string', { default: '' }),
    prop('value', 'string', { default: '' }),
    /* A link's, for a row that is a destination. */
    prop('download', 'boolean', { default: false, platform: 'web' }),
    prop('rel', 'string', { default: '', platform: 'web' }),
    prop('target', 'string', { default: '', platform: 'web' }),
  ],
  states: [
    'checked',
    'disabled',
    'expanded',
    'highlighted',
    'placed-bottom',
    'placed-left',
    'placed-right',
    'placed-top',
    'settled',
    'submenu-mark',
    'submenu-start',
  ],
  tree: [
    pressable(
      'item',
      {
        chooses: true,
        describedby: 'description end',
        disabled: bind('disabled'),
        href: bind('href'),
        popup: pick('has-submenu', { true: 'menu' }, ''),
        role: bind('role'),
        sends: 'before-select',
      },
      [
        box('start', {}, [region('start')]),
        /* The label over its description on a phone, which lays a row out
           in a line. The web places the two on the row's grid. */
        wrap('label', { platform: 'native', while: true }, [
          region('default'),
          region('description', { decorative: true }),
        ]),
        box('end', { hidden: not('ends') }, [
          when(
            'shortcut',
            box('shortcut', {
              decorative: true,
              draws: 'kbd',
              exports: { kbd: true, key: true, separator: true },
              gives: { keys: bind('shortcut') },
            }),
          ),
          region('end', { decorative: true }),
        ]),
        /* The column the mark stands at the end of on a phone, as wide as
           the page keeps it. The web's is the row's last track. */
        wrap('tail', { platform: 'native', while: true }, [
          when(
            'has-submenu',
            region('chevron', { decorative: true }, [
              box('mark', { decorative: true, glyph: 'caret-right' }),
            ]),
          ),
          unless(
            'has-submenu',
            when(
              'checked',
              region('check', { decorative: true }, [
                box('mark', { decorative: true, glyph: 'check' }),
              ]),
            ),
          ),
        ]),
      ],
    ),
    /* The panel a row's page flies out in, beside the row. */
    box('surface', { platform: 'web', role: 'menu' }),
    region('submenu'),
  ],
})
