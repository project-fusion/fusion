import {
  bind,
  box,
  collection,
  derive,
  event,
  headless,
  layer,
  live,
  pick,
  pressable,
  prop,
  region,
  stack,
  text,
  toggle,
  unless,
  when,
  wrap,
} from '../../../tree.js'

/**
 * Menu's headless tier: a panel of rows that opens from its trigger, opened
 * on `open`, one page of rows showing at a time.
 *
 * **A press on the trigger opens the menu, and closes it while it is
 * open.** The trigger is passed into `trigger`, and the panel is placed
 * against it on the side `placement` names, `offset` from it, turned to the
 * other side where that one has no room. **In a window narrower than 30rem
 * it is a sheet** along the window's bottom edge, and `presentation` draws
 * a sheet or a popover at any width. Down and Up on the trigger open it
 * with focus on the first row or the last. Under `open-on="long-press"` a
 * press is the trigger's own, and a press held for half a second, or Alt
 * with Down or Up, opens it, the trigger described by `long-press-label`.
 *
 * **Choosing a row sends its `select`**, which reaches the menu's handler
 * and which a handler may refuse, and closes the menu once it stands, with
 * focus back on the trigger, unless `close-on-select` is false or the row's
 * own says otherwise. A choice row turns first, after its `before-toggle`,
 * and the menu sends `change` as the rows checked change. A close request
 * and a press outside close it too. Every way it opens and closes asks
 * `before-open` or `before-close` first, which a handler may refuse, and
 * `toggle` is sent once it stands the other way.
 *
 * **A row whose `submenu` holds rows opens that page** in place of the one
 * showing, on a press or the arrow along the line, with focus on its first
 * row. The header over the page holds the way back, named by `back-label`,
 * and the page's name, which names the panel. The way back, the arrow back,
 * and Escape go up one level, and Escape on the top page closes the menu.
 *
 * **The keys move among the rows of the page**, coming round at the ends,
 * Home and End go to the first and the last, and a typed letter moves to
 * the next row whose name starts with it. While `loading` holds, the panel
 * says `loading-text`, and with no rows `empty-text`, each told to a screen
 * reader too.
 *
 * **Under `context` the trigger is an area**, and the menu its context
 * menu: on a phone a long press on it opens the menu against it, and a
 * press is the area's own.
 *
 * **The web's**: `submenus="flyout"`, a panel beside its row, which a phone
 * drills into in place; the filter, `for`, and `targets`; a context menu
 * placed at the pointer; and the rows a mouse resting on them focuses. A
 * phone has one panel at a time, no pointer to rest, and no document to
 * find an element in by its id.
 *
 * **Held to `helix-menu`.** `helix family check` compares the props, the
 * events, the states, the regions, and the parts with what the manifest
 * says the element has.
 */
export default headless('menu', {
  collection: collection({
    after: 'change',
    closes: { event: 'select', while: 'close-on-select' },
    keys: { chooses: false, keeps: ['ArrowLeft', 'ArrowRight'], wrap: true },
    mixes: true,
  }),
  derived: {
    arrows: derive('menu-arrows'),
    'back-name': derive('menu-back-name'),
    'empty-words': derive('menu-empty'),
    'hold-hint': derive('menu-hold-hint'),
    holds: derive('menu-holds'),
    'loading-words': derive('menu-loading'),
    marked: derive('menu-mark'),
    name: derive('menu-name'),
    rows: bind('default'),
    started: derive('menu-start'),
    status: derive('menu-status'),
  },
  events: [
    event('before-close', { cancelable: true, detail: ['open'] }),
    event('before-open', { cancelable: true, detail: ['open'] }),
    event('change', { bare: true }),
    event('filter', { cancelable: true, detail: ['value'], platform: 'web' }),
    event('select', { cancelable: true, detail: ['value'] }),
    event('toggle', { bare: true, detail: ['newState', 'oldState'] }),
  ],
  props: [
    prop('back-label', 'string', { default: 'Back' }),
    prop('close-on-select', 'boolean', { default: true }),
    prop('context', 'boolean', { default: false }),
    prop('default-open', 'boolean', { default: false }),
    prop('empty-text', 'string', { default: 'Nothing to show' }),
    prop('label', 'string', { default: '' }),
    prop('loading', 'boolean', { default: false }),
    prop('loading-text', 'string', { default: 'Loading' }),
    prop('long-press-label', 'string', {
      default: 'Long press or press Alt+Down to show the menu',
    }),
    prop('offset', 'number', { default: 4 }),
    prop('open', 'boolean'),
    prop('open-on', ['click', 'long-press'], { default: 'click' }),
    prop(
      'placement',
      [
        'bottom',
        'bottom-end',
        'bottom-start',
        'left',
        'left-end',
        'left-start',
        'right',
        'right-end',
        'right-start',
        'top',
        'top-end',
        'top-start',
      ],
      { default: 'bottom-start' },
    ),
    prop('presentation', ['auto', 'popover', 'sheet'], { default: 'auto' }),
    prop('submenus', ['drill', 'flyout'], { default: 'drill' }),
    /* The filter, an area by its id, and the things in it a context menu is about. */
    prop('filter', 'string', { default: '', platform: 'web' }),
    prop('filter-label', 'string', { default: 'Filter', platform: 'web' }),
    prop('filterable', 'boolean', { default: false, platform: 'web' }),
    prop('for', 'string', { default: '', platform: 'web' }),
    prop('no-results-text', 'string', { default: 'No matches', platform: 'web' }),
    prop('results-label', 'string', {
      default: '{count, plural, one {# result} other {# results}}',
      platform: 'web',
    }),
    prop('targets', 'string', { default: '', platform: 'web' }),
  ],
  stack: stack({ back: 'back', drilled: 'drilled', label: 'page-label', top: 'name' }),
  states: [
    'aligned-end',
    'aligned-start',
    'drilled',
    'entering',
    'exiting',
    'mark',
    'open',
    'placed-bottom',
    'placed-left',
    'placed-right',
    'placed-top',
    'settled',
    'sheet',
    'start',
  ],
  toggle: toggle({
    changes: 'toggle',
    checked: 'open',
    closes: 'before-close',
    initial: 'default-open',
    opens: 'before-open',
  }),
  tree: [
    /* The trigger's own box on a phone, which the panel is placed against.
       The web places it against the trigger passed in. */
    wrap('trigger', { platform: 'native', while: true }, [region('trigger')]),
    layer(
      'surface',
      {
        anchor: 'trigger',
        arrows: bind('arrows'),
        closedby: 'any',
        enters: 'press',
        hint: bind('hold-hint'),
        holds: bind('holds'),
        label: bind('page-label'),
        offset: bind('offset'),
        open: bind('open'),
        placement: bind('placement'),
        presentation: bind('presentation'),
        presses: pick('holds', { true: 'none' }, 'toggle'),
        returns: 'held',
        role: 'menu',
      },
      [
        when(
          'drilled',
          box('header', {}, [
            pressable('back', { label: bind('back-name'), role: 'menuitem' }, [
              box('back-mark', { decorative: true, glyph: 'caret-left' }),
            ]),
            box('title', {}, [text('title-words', { says: bind('page-label') })]),
          ]),
        ),
        box('search-field', { platform: 'web' }),
        region('default'),
        /* What the filter says where it keeps no rows. */
        region('no-results', { platform: 'web' }),
        when(
          'loading',
          box('loading', {}, [
            region('loading', {}, [text('loading-words', { says: bind('loading-words') })]),
          ]),
        ),
        unless(
          'loading',
          unless(
            'rows',
            box('empty', {}, [
              region('empty', {}, [text('empty-words', { says: bind('empty-words') })]),
            ]),
          ),
        ),
      ],
    ),
    live('live', { follows: 'status', says: bind('status') }),
  ],
})
