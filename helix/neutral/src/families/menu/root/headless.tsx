import {
  Announce,
  bare,
  boolean,
  cancelable,
  headless,
  Layer,
  oneOf,
  Pressable,
  Slot,
  Text,
  View,
  Wrap,
  web,
} from '../../../render.js'
import { bind, collection, derive, stack, toggle } from '../../../tree.js'

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
 * **Choosing a row sends its `before-select`**, which reaches the menu's
 * handler and which a handler may refuse, then its `select`, and closes the menu once it stands, with
 * focus back on the trigger, unless `close-on-select` is false or the row's
 * own says otherwise. A choice row turns first, after its `before-check`,
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
    closes: { event: 'before-select', while: 'close-on-select' },
    keys: { chooses: false, keeps: ['ArrowLeft', 'ArrowRight'], wrap: true },
    mixes: true,
  }),
  derived: {
    arrows: derive('menu-arrows'),
    backName: derive('menu-back-name'),
    emptyWords: derive('menu-empty'),
    holdHint: derive('menu-hold-hint'),
    holds: derive('menu-holds'),
    loadingWords: derive('menu-loading'),
    marked: derive('menu-mark'),
    name: derive('menu-name'),
    rows: bind('default'),
    started: derive('menu-start'),
    status: derive('menu-status'),
  },
  events: {
    beforeClose: cancelable(['open']),
    beforeFilter: web(cancelable(['value'])),
    beforeOpen: cancelable(['open']),
    beforeSelect: cancelable(['value']),
    change: bare(),
    filter: web(['value']),
    select: ['value'],
    toggle: bare(['newState', 'oldState']),
  },
  props: {
    backLabel: 'Back',
    closeOnSelect: true,
    context: false,
    defaultOpen: false,
    emptyText: 'Nothing to show',
    /* `filter`, `filterLabel`, `filterable`, `for`, `noResultsText`,
       `resultsLabel`, and `targets` are the web's: the filter, an area by its
       id, and the things in it a context menu is about. */
    filter: web(''),
    filterable: web(false),
    filterLabel: web('Filter'),
    for: web(''),
    label: '',
    loading: false,
    loadingText: 'Loading',
    longPressLabel: 'Long press or press Alt+Down to show the menu',
    noResultsText: web('No matches'),
    offset: 4,
    open: boolean(),
    openOn: oneOf(['click', 'long-press'], 'click'),
    placement: oneOf(
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
      'bottom-start',
    ),
    presentation: oneOf(['auto', 'popover', 'sheet'], 'auto'),
    resultsLabel: web('{count, plural, one {# result} other {# results}}'),
    submenus: oneOf(['drill', 'flyout'], 'drill'),
    targets: web(''),
  },
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
  render: ({ derived, props, stack, state }) => (
    <>
      {/* The trigger's own box on a phone, which the panel is placed against.
          The web places it against the trigger passed in. */}
      <Wrap
        part="trigger"
        platform="native"
      >
        <Slot name="trigger" />
      </Wrap>
      <Layer
        anchor="trigger"
        arrows={derived.arrows}
        closedby="any"
        enters="press"
        hint={derived.holdHint}
        holds={derived.holds}
        label={stack.label}
        offset={props.offset}
        open={props.open}
        part="surface"
        placement={props.placement}
        presentation={props.presentation}
        presses={derived.holds ? 'none' : 'toggle'}
        returns="held"
        role="menu"
      >
        {state.drilled && (
          <View part="header">
            <Pressable
              label={derived.backName}
              part="back"
              role="menuitem"
            >
              <View
                ariaHidden
                icon="caret-left"
                part="back-mark"
              />
            </Pressable>
            <View part="title">
              <Text part="title-words">{stack.label}</Text>
            </View>
          </View>
        )}
        <View
          part="search-field"
          platform="web"
        />
        <Slot />
        {/* What the filter says where it keeps no rows. */}
        <Slot
          name="no-results"
          platform="web"
        />
        {props.loading && (
          <View part="loading">
            <Slot name="loading">
              <Text part="loading-words">{derived.loadingWords}</Text>
            </Slot>
          </View>
        )}
        {!props.loading && !derived.rows && (
          <View part="empty">
            <Slot name="empty">
              <Text part="empty-words">{derived.emptyWords}</Text>
            </Slot>
          </View>
        )}
      </Layer>
      <Announce
        follows="status"
        part="live"
      >
        {derived.status}
      </Announce>
    </>
  ),
})
