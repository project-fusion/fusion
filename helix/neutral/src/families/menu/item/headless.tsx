import {
  boolean,
  cancelable,
  headless,
  Pressable,
  Slot,
  set,
  View,
  Wrap,
  web,
} from '../../../render.js'
import { bind, derive } from '../../../tree.js'

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
  memberOf: set('menu', {
    checkable: 'checkable',
    checked: 'checked',
    closeWhen: 'closeOnSelect',
    exclusive: 'exclusive',
    onBeforeChange: 'beforeCheck',
    pageSlot: 'submenu',
  }),
  props: {
    checkable: false,
    checked: false,
    closeOnSelect: boolean(),
    disabled: false,
    /* `download`, `rel`, and `target` are a link's, for a row that is a
       destination. */
    download: web(false),
    exclusive: false,
    href: '',
    rel: web(''),
    shortcut: '',
    target: web(''),
    value: '',
  },
  events: {
    beforeCheck: cancelable(['checked']),
    beforeSelect: cancelable(['value']),
    select: ['value'],
  },
  states: [
    'checked',
    'disabled',
    'expanded',
    'highlighted',
    'placedBottom',
    'placedLeft',
    'placedRight',
    'placedTop',
    'settled',
    'submenuMark',
    'submenuStart',
  ],
  derived: {
    described: bind('description'),
    ends: derive('menu-item-ends'),
    hasSubmenu: bind('submenu'),
    role: derive('menu-item-role'),
    started: bind('start'),
    submenuMarked: derive('menu-item-submenu-mark'),
    submenuStarted: derive('menu-item-submenu-start'),
  },
  render: ({ derived, props, send }) => (
    <>
      <Pressable
        describedby="description end"
        disabled={props.disabled}
        href={props.href}
        onPress={send.beforeSelect}
        part="item"
        popup={derived.hasSubmenu ? 'menu' : ''}
        role={derived.role}
        selects
      >
        <View part="start">
          <Slot name="start" />
        </View>
        {/* The label over its description on a phone, which lays a row out
            in a line. The web places the two on the row's grid. */}
        <Wrap
          part="label"
          platform="native"
        >
          <Slot />
          <Slot
            ariaHidden
            name="description"
          />
        </Wrap>
        <View
          hidden={!derived.ends}
          part="end"
        >
          {props.shortcut && (
            <View
              ariaHidden
              draws="kbd"
              exports={{ kbd: true, key: true, separator: true }}
              gives={{ keys: props.shortcut }}
              part="shortcut"
            />
          )}
          <Slot
            ariaHidden
            name="end"
          />
        </View>
        {/* The column the mark stands at the end of on a phone, as wide as
            the page keeps it. The web's is the row's last track. */}
        <Wrap
          part="tail"
          platform="native"
        >
          {derived.hasSubmenu && (
            <Slot
              ariaHidden
              name="chevron"
            >
              <View
                ariaHidden
                icon="caret-right"
                part="mark"
              />
            </Slot>
          )}
          {!derived.hasSubmenu && props.checked && (
            <Slot
              ariaHidden
              name="check"
            >
              <View
                ariaHidden
                icon="check"
                part="mark"
              />
            </Slot>
          )}
        </Wrap>
      </Pressable>
      {/* The panel a row's page flies out in, beside the row. */}
      <View
        part="surface"
        platform="web"
        role="menu"
      />
      <Slot name="submenu" />
    </>
  ),
})
