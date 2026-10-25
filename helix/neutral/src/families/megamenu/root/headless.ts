import {
  bind,
  collection,
  derive,
  event,
  headless,
  item,
  layer,
  pressable,
  prop,
  region,
  text,
  toggle,
  when,
  wrap,
} from '../../../tree.js'

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
 * `variant="band"`: its groups stand in a column while the window is
 * narrower than `band-below`, the element's `narrow` state, and side by side
 * otherwise. It is a group named by `label`. A press outside closes it, and
 * a close request, which is Escape, a phone's back, or a screen reader's
 * escape, closes it, each with focus back on the trigger.
 * A press opens it and leaves focus on the trigger, and Down on the trigger
 * moves focus to the panel's first destination, opening it first where it is
 * closed. A press on the trigger and a destination chosen close it and leave
 * focus where they put it. **One megamenu stands open at a time**: opening
 * one asks the one open to close, and a press on another's trigger opens
 * that one in its place. **Choosing a destination closes it** once the item's `select`
 * stands.
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
 * **Held to `helix-megamenu`.** `helix family check` compares the props,
 * the events, the states, the regions, and the parts with what the
 * manifest says the element has.
 */
export default headless('megamenu', {
  collection: collection({
    closes: { event: 'select' },
    keys: {
      chooses: false,
      keeps: ['ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'End', 'Home'],
      letters: false,
      wrap: false,
    },
    marked: true,
  }),
  derived: {
    current: derive('megamenu-current'),
    narrow: derive('megamenu-narrow'),
  },
  events: [
    event('before-close', { cancelable: true, detail: ['open'] }),
    event('before-open', { cancelable: true, detail: ['open'] }),
    event('toggle', { bare: true, detail: ['newState', 'oldState'] }),
  ],
  item: item('navigation', { chooses: true, flag: 'current', value: 'label' }),
  props: [
    prop('band-below', 'number', { default: 640 }),
    prop('default-open', 'boolean', { default: false }),
    prop('label', 'string', { default: '' }),
    prop('open', 'boolean'),
    /* A phone opens on a press under either, having no pointer to rest. */
    prop('open-on', ['click', 'hover'], { default: 'hover' }),
    prop('variant', ['band']),
    /* Hover intent, and the card placed against the trigger. */
    prop('close-delay', 'number', { default: 220, platform: 'web' }),
    prop('open-delay', 'number', { default: 120, platform: 'web' }),
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
      { default: 'bottom-start', platform: 'web' },
    ),
  ],
  states: ['current', 'from-end', 'from-start', 'narrow', 'open', 'settled', 'to-end', 'to-start'],
  toggle: toggle({
    changes: 'toggle',
    checked: 'open',
    closes: 'before-close',
    initial: 'default-open',
    opens: 'before-open',
  }),
  tree: [
    /* The trigger's own box on a phone, which the band hangs from. The web
       hangs it from the bar the trigger stands in. */
    wrap('anchor', { platform: 'native', while: true }, [
      region('trigger', {}, [
        pressable('trigger', { chooses: true, expanded: bind('open'), role: 'button' }, [
          text('trigger-words', { says: bind('label') }),
        ]),
      ]),
    ]),
    when('open', region('indicator', { decorative: true, part: 'indicator' })),
    layer(
      'surface',
      {
        alone: true,
        anchor: 'anchor',
        band: true,
        closedby: 'any',
        enters: 'down',
        label: bind('label'),
        open: bind('open'),
        presses: 'toggle',
        returns: 'dismissed',
        role: 'group',
      },
      [region('default', { part: 'columns' })],
    ),
  ],
})
