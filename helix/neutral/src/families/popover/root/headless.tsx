import {
  Announce,
  bare,
  boolean,
  cancelable,
  headless,
  Layer,
  number,
  oneOf,
  Slot,
  View,
  Wrap,
  web,
} from '../../../render.js'
import { derive } from '../../../tree.js'

/**
 * Popover's headless tier: a panel that opens next to its trigger and holds
 * any content, opened on `open`.
 *
 * **A press on the trigger opens it, and closes it while it is open.** The
 * trigger is passed into `trigger`, and the panel is placed against it on
 * the side `placement` names, turned to the other side where that one has
 * no room unless `flip` is false, `offset` from it and slid along it by
 * `cross-offset`. A trigger that says whether it is expanded, as a Button
 * does, says whether the panel is open.
 *
 * **Every way out asks `before-close` first**, which a handler may refuse:
 * a close request, which is Escape, a phone's back, or a screen reader's
 * escape, and a press outside the panel. `toggle` is sent once it stands
 * open or closed. Opening moves focus into the panel, and closing from
 * inside gives it back to the trigger.
 *
 * **`modal` holds the reader in the panel** while it is open, as a dialog
 * does, and a press outside and a close request still close it. `arrow`
 * draws a point on the panel's edge facing the trigger.
 *
 * **Its name is `label`**, then `fallback-label`. A phone says its name as
 * it opens.
 *
 * **The web's**: the invoker commands, an `anchor` other than the trigger,
 * `container-padding`, a name taken from the first heading inside, a press
 * a command's invoker sends, and focus moving out of the trigger and the
 * panel closing it. A phone has no command, no document to find an element
 * in by its id, and keeps every layer 8 points from the window's edges.
 *
 * **Held to `helix-popover`.** `helix family check` compares the props, the
 * events, the states, the regions, and the parts with what the manifest says
 * the element has.
 */
export default headless('popover', {
  props: {
    /* `anchor` is an element by its id, and `containerPadding` the room kept
       from the window's edges. */
    anchor: web(''),
    arrow: false,
    containerPadding: web(number()),
    crossOffset: 0,
    defaultOpen: false,
    fallbackLabel: 'Popover',
    flip: true,
    label: '',
    modal: false,
    offset: 4,
    open: boolean(),
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
  },
  events: {
    beforeClose: cancelable(['open']),
    beforeOpen: cancelable(['open']),
    toggle: bare(['newState', 'oldState']),
  },
  states: [
    'alignedEnd',
    'alignedStart',
    'entering',
    'exiting',
    'open',
    'placedBottom',
    'placedLeft',
    'placedRight',
    'placedTop',
    'settled',
  ],
  derived: {
    name: derive('popover-name'),
  },
  toggle: {
    defaultProp: 'defaultOpen',
    onBeforeClose: 'beforeClose',
    onBeforeOpen: 'beforeOpen',
    onToggle: 'toggle',
    prop: 'open',
  },
  render: ({ derived, props, state }) => (
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
        arrow="arrow"
        closedby="any"
        cross-offset={props.crossOffset}
        flip={props.flip}
        label={derived.name}
        modal={props.modal}
        offset={props.offset}
        open={props.open}
        part="surface"
        placement={props.placement}
        presses="toggle"
        role="dialog"
      >
        {props.arrow && (
          <View
            also={{
              'arrow-bottom': state.placedBottom,
              'arrow-left': state.placedLeft,
              'arrow-right': state.placedRight,
              'arrow-top': state.placedTop,
            }}
            ariaHidden
            part="arrow"
          />
        )}
        <View part="content">
          <Slot />
        </View>
        <Announce
          arrives
          part="opening"
          platform="native"
        >
          {derived.name}
        </Announce>
      </Layer>
    </>
  ),
})
