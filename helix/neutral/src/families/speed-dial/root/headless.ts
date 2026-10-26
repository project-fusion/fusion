import {
  bind,
  box,
  collection,
  derive,
  event,
  headless,
  layer,
  pick,
  pressable,
  prop,
  region,
  toggle,
  wrap,
} from '../../../tree.js'

/**
 * Speed Dial's headless tier: a floating action button and the actions it
 * opens beside it, opened on `open`.
 *
 * **A press on the trigger opens the actions, and closes them while they
 * stand open.** The trigger is passed into `trigger`, or drawn, a button
 * named by `label` with a plus that `icon` replaces. The actions stand on
 * the side `placement` names, `offset` from it, turned to the other side
 * where that one has no room, and focus moves to the first of them as a
 * press or a key opens them. Down and Up on the trigger open them on the
 * first action or the last.
 *
 * **Choosing an action sends its `before-select`**, which a handler may
 * refuse, then its `select`, and closes the dial once it stands, with focus back on the trigger. A
 * close request and a press outside close it too. Every way it opens and
 * closes asks `before-open` or `before-close` first, which a handler may
 * refuse, and `toggle` is sent once it stands the other way.
 *
 * **Under `open-on="long-press"` a press is the trigger's own**, and a
 * finger held still for half a second opens the actions, as do Alt with
 * Down and Alt with Up. The trigger is described by `long-press-label`.
 *
 * **The web's**: `open-on="hover"`, which a phone opens on a press as it
 * does under `click`, since a phone has no pointer to rest.
 *
 * **Held to `helix-speed-dial`.** `helix family check` compares the props,
 * the events, the states, the regions, and the parts with what the
 * manifest says the element has.
 */
export default headless('speed-dial', {
  collection: collection({
    closes: { event: 'before-select' },
    keys: { chooses: false, wrap: true },
    mixes: true,
  }),
  derived: {
    'hold-hint': derive('speed-dial-hold-hint'),
    holds: derive('speed-dial-holds'),
    name: derive('speed-dial-name'),
  },
  events: [
    event('before-close', { cancelable: true, detail: ['open'] }),
    event('before-open', { cancelable: true, detail: ['open'] }),
    event('before-select', { cancelable: true, detail: ['value'] }),
    event('select', { detail: ['value'] }),
    event('toggle', { bare: true, detail: ['newState', 'oldState'] }),
  ],
  props: [
    prop('default-open', 'boolean', { default: false }),
    prop('fallback-label', 'string', { default: 'Actions' }),
    prop('label', 'string', { default: '' }),
    prop('long-press-label', 'string', {
      default: 'Long press or press Alt+Down to show the actions',
    }),
    prop('offset', 'number', { default: 12 }),
    prop('open', 'boolean'),
    prop('open-on', ['click', 'hover', 'long-press'], { default: 'click' }),
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
      { default: 'top-end' },
    ),
  ],
  states: [
    'aligned-end',
    'aligned-start',
    'open',
    'placed-bottom',
    'placed-left',
    'placed-right',
    'placed-top',
    'settled',
  ],
  toggle: toggle({
    changes: 'toggle',
    checked: 'open',
    closes: 'before-close',
    initial: 'default-open',
    opens: 'before-open',
  }),
  tree: [
    /* The trigger's own box on a phone, which the actions are placed
       against. The web places them against the trigger. */
    wrap('anchor', { platform: 'native', while: true }, [
      region('trigger', {}, [
        pressable(
          'trigger',
          { expanded: bind('open'), label: bind('name'), popup: 'menu', role: 'button' },
          [
            region('icon', {}, [
              box('icon-mark', { decorative: true, glyph: 'plus', platform: 'native' }),
            ]),
          ],
        ),
      ]),
    ]),
    layer(
      'actions',
      {
        anchor: 'anchor',
        arrows: true,
        closedby: 'any',
        enters: 'press',
        hint: bind('hold-hint'),
        holds: bind('holds'),
        label: bind('name'),
        offset: bind('offset'),
        open: bind('open'),
        placement: bind('placement'),
        presses: pick('open-on', { 'long-press': 'none' }, 'toggle'),
        role: 'menu',
      },
      [region('default')],
    ),
  ],
})
