import {
  bare,
  boolean,
  cancelable,
  headless,
  Layer,
  oneOf,
  Pressable,
  Slot,
  View,
  Wrap,
} from '../../../render.js'
import { collection, derive, toggle } from '../../../tree.js'

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
  props: {
    defaultOpen: false,
    fallbackLabel: 'Actions',
    label: '',
    longPressLabel: 'Long press or press Alt+Down to show the actions',
    offset: 12,
    open: boolean(),
    openOn: oneOf(['click', 'hover', 'long-press'], 'click'),
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
      'top-end',
    ),
  },
  events: {
    beforeClose: cancelable(['open']),
    beforeOpen: cancelable(['open']),
    beforeSelect: cancelable(['value']),
    select: ['value'],
    toggle: bare(['newState', 'oldState']),
  },
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
  derived: {
    holdHint: derive('speed-dial-hold-hint'),
    holds: derive('speed-dial-holds'),
    name: derive('speed-dial-name'),
  },
  collection: collection({
    closes: { event: 'before-select' },
    keys: { chooses: false, wrap: true },
    mixes: true,
  }),
  toggle: toggle({
    changes: 'toggle',
    checked: 'open',
    closes: 'before-close',
    initial: 'default-open',
    opens: 'before-open',
  }),
  render: ({ derived, props }) => (
    <>
      {/* The trigger's own box on a phone, which the actions are placed
          against. The web places them against the trigger. */}
      <Wrap
        part="anchor"
        platform="native"
      >
        <Slot name="trigger">
          <Pressable
            expanded={props.open}
            label={derived.name}
            part="trigger"
            popup="menu"
            role="button"
          >
            <Slot name="icon">
              <View
                ariaHidden
                icon="plus"
                part="icon-mark"
                platform="native"
              />
            </Slot>
          </Pressable>
        </Slot>
      </Wrap>
      <Layer
        anchor="anchor"
        arrows
        closedby="any"
        enters="press"
        hint={derived.holdHint}
        holds={derived.holds}
        label={derived.name}
        offset={props.offset}
        open={props.open}
        part="actions"
        placement={props.placement}
        presses={props.openOn === 'long-press' ? 'none' : 'toggle'}
        role="menu"
      >
        <Slot />
      </Layer>
    </>
  ),
})
