import {
  bare,
  boolean,
  cancelable,
  headless,
  Layer,
  oneOf,
  Slot,
  Text,
  View,
  Wrap,
  web,
} from '../../../render.js'
import { derive } from '../../../tree.js'

/**
 * Tooltip's headless tier: a short text that appears next to its trigger,
 * opened on `open`.
 *
 * **The trigger is passed in, and the tooltip describes it** with the words
 * of `content`, or of the content passed into `content`: a phone's hint,
 * and the trigger's description on the web. A trigger already named by
 * those words is not described by them again.
 *
 * **It shows as a reader asks**: on the web, as the pointer rests on the
 * trigger for `delay` or focus lands on it, and it hides `delay-out` after
 * the pointer leaves, on blur, and on Escape. A phone has no pointer to
 * rest, so a long press on the trigger shows it, where the trigger has no
 * long press of its own, as the plan for hover-only patterns says, and a
 * touch elsewhere or a close request hides it. **Using the trigger hides
 * it**, unless `persist` is set, for words that change to say what the
 * trigger did, as a copy button's do. `disabled` keeps it from showing.
 *
 * **Every way it shows and hides asks first**: `before-open` and
 * `before-close`, which a handler may refuse, and `toggle` is sent once it
 * stands the other way. The bubble stands on the side `placement` names,
 * `offset` from the trigger to the tip of its arrow, and turns to another
 * side where that one has no room.
 *
 * **The web's**: `for`, which names a trigger by its id, `hoverable`,
 * `show-on`, `skip-delay`, `within`, and the delays, which time a pointer.
 * A phone has no document to find a trigger in and no pointer to time.
 *
 * **Held to `helix-tooltip`.** `helix system check` compares the props, the
 * events, the states, the regions, and the parts with what the manifest says
 * the element has.
 */
export default headless('tooltip', {
  props: {
    content: '',
    defaultOpen: false,
    /* `delay`, `delayOut`, `for`, `hoverable`, `showOn`, `skipDelay`, and
       `within` are what a pointer and a document have. */
    delay: web(400),
    delayOut: web(100),
    disabled: false,
    for: web(''),
    hoverable: web(true),
    offset: 8,
    open: boolean(),
    persist: false,
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
      'top',
    ),
    showOn: web(oneOf(['focus'])),
    skipDelay: web(300),
    within: web(''),
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
    hint: derive('tooltip-hint'),
  },
  toggle: {
    defaultProp: 'defaultOpen',
    onBeforeClose: 'beforeClose',
    onBeforeOpen: 'beforeOpen',
    onToggle: 'toggle',
    prop: 'open',
    readonly: 'disabled',
  },
  render: ({ derived, props, state }) => (
    <>
      {/* The trigger's own box on a phone, which the bubble is placed against.
          The web places it against the trigger passed in. */}
      <Wrap
        part="trigger"
        platform="native"
      >
        <Slot />
      </Wrap>
      <Layer
        also={{
          'surface-bottom': state.placedBottom,
          'surface-left': state.placedLeft,
          'surface-right': state.placedRight,
          'surface-top': state.placedTop,
        }}
        anchor="trigger"
        anchorPress={props.persist ? 'none' : 'close'}
        arrow="arrow"
        closedby="any"
        hint={derived.hint}
        offset={props.offset}
        open={props.open}
        part="surface"
        placement={props.placement}
        role="tooltip"
      >
        <View
          also={{
            'arrow-bottom': state.placedBottom,
            'arrow-left': state.placedLeft,
            'arrow-right': state.placedRight,
            'arrow-top': state.placedTop,
          }}
          part="arrow"
        />
        <Slot name="content">
          <Text part="words">{props.content}</Text>
        </Slot>
      </Layer>
    </>
  ),
})
