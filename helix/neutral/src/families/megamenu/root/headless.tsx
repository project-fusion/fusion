import {
  bare,
  boolean,
  cancelable,
  headless,
  Layer,
  oneOf,
  Pressable,
  Slot,
  set,
  Text,
  Wrap,
  web,
} from '../../../render.js'
import { derive } from '../../../tree.js'

/**
 * Megamenu's headless tier: a section of a navigation, a trigger that
 * discloses a panel of destinations, opened on `open`.
 *
 * **A press on the trigger opens the panel, and closes it while it is
 * open.** The trigger is passed into `trigger`, or drawn, a button named by
 * `label` that says whether the panel is expanded. Every way it opens and
 * closes asks `before-open` or `before-close` first, which a handler may
 * refuse, and `toggle` is sent once it stands the other way.
 *
 * **The panel is a band across the window under the trigger** on a phone,
 * as the web draws it in a page narrower than `band-below` and under
 * `layout="band"`: its groups stand in a column while the window is
 * narrower than `band-below`, the element's `narrow` state, and side by side
 * otherwise. It is a group named by `label`. A press outside closes it, and
 * a close request, which is Escape, a phone's back, or a screen reader's
 * escape, closes it, each with focus back on the trigger.
 * A press opens it and leaves focus on the trigger, and Down on the trigger
 * moves focus to the panel's first destination, opening it first where it is
 * closed. A press on the trigger and a destination chosen close it and leave
 * focus where they put it. **One megamenu stands open at a time**: opening
 * one asks the one open to close, and a press on another's trigger opens
 * that one in its place. **Choosing a destination closes it** once the
 * item's `before-select` stands.
 *
 * **The panel's destinations are Megamenu Items**, which a group's heading
 * may name, and the megamenu is `current` while one of them is the page,
 * read from what is passed in, so it holds while the panel is closed. In a
 * Navigation the megamenu is one of its destinations: the navigation's
 * arrow keys reach its trigger, its mark stands at it while it is current,
 * and the navigation is `open` while the panel is. The megamenu stands for
 * its `label` there. While the panel is open, what is passed into
 * `indicator` is drawn on the trigger.
 *
 * **The web's**: hover intent, `open-delay`, and `close-delay`, since a
 * phone has no pointer to rest, so a phone opens on a press under either
 * `open-on`; the card a panel is drawn as in a wide page, placed by
 * `placement`, which a phone draws as the band; the direction one panel
 * hands over to the next in, `from-start`, `from-end`, `to-start`, and
 * `to-end`, and the sizes written for a sheet that grows one panel into the
 * next, which no rule of the styled tier reads and a phone has no sheet of
 * the page's to read; the band's top at the bar the trigger stands in, which
 * a phone takes from the trigger; and a press on any link or control of the
 * panel closing it, which a phone hears from its Megamenu Items alone.
 *
 * **Held to `helix-megamenu`.** `helix system check` compares the props,
 * the events, the states, the regions, and the parts with what the
 * manifest says the element has.
 */
export default headless('megamenu', {
  memberOf: set('navigation', { current: 'current', value: 'label' }),
  props: {
    bandBelow: 640,
    /* `closeDelay` and `openDelay` are hover intent, and `placement` the card
       placed against the trigger. */
    closeDelay: web(220),
    defaultOpen: false,
    label: '',
    layout: oneOf(['band']),
    open: boolean(),
    openDelay: web(120),
    /* A phone opens on a press under either, having no pointer to rest. */
    openOn: oneOf(['click', 'hover'], 'hover'),
    placement: web(
      oneOf(
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
    ),
  },
  events: {
    beforeClose: cancelable(['open']),
    beforeOpen: cancelable(['open']),
    toggle: bare(['newState', 'oldState']),
  },
  states: ['current', 'fromEnd', 'fromStart', 'narrow', 'open', 'settled', 'toEnd', 'toStart'],
  derived: {
    current: derive('megamenu-current'),
    narrow: derive('megamenu-narrow'),
  },
  collection: {
    closeOn: 'select',
    currentFromItems: true,
    keys: {
      itemKeys: ['ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'End', 'Home'],
      loop: false,
      selectionFollowsFocus: false,
      typeahead: false,
    },
  },
  toggle: {
    defaultProp: 'defaultOpen',
    onBeforeClose: 'beforeClose',
    onBeforeOpen: 'beforeOpen',
    onToggle: 'toggle',
    prop: 'open',
  },
  render: ({ props }) => (
    <>
      {/* The trigger's own box on a phone, which the band hangs from. The web
          hangs it from the bar the trigger stands in. */}
      <Wrap
        part="anchor"
        platform="native"
      >
        <Slot name="trigger">
          <Pressable
            expanded={props.open}
            part="trigger"
            role="button"
            selects
          >
            <Text part="trigger-words">{props.label}</Text>
          </Pressable>
        </Slot>
      </Wrap>
      {props.open && (
        <Slot
          ariaHidden
          name="indicator"
          part="indicator"
        />
      )}
      <Layer
        alone
        anchor="anchor"
        anchorPress="toggle"
        band
        closedby="any"
        initialFocus="down"
        label={props.label}
        open={props.open}
        part="surface"
        restoreFocus="dismissed"
        role="group"
      >
        <Slot part="columns" />
      </Layer>
    </>
  ),
})
