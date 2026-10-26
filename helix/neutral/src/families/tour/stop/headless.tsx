import {
  Announce,
  headless,
  Layer,
  object,
  oneOf,
  property,
  Slot,
  Text,
  View,
  Wrap,
} from '../../../render.js'
import { derive, stop } from '../../../tree.js'

/**
 * Tour Stop's headless tier: one stop on a tour, the element it points at,
 * and a panel of content about it.
 *
 * **Its panel is placed against its target**, the element `for` names, on
 * the side `placement` asks for, turned to the other side where that one
 * has no room, the tour's `spotlight-padding` and its arrow clear of the
 * target, with an arrow that points at it. The web finds the target by its
 * id. **A phone finds it by the view registered under that id**: a Helix
 * element given an `id` registers its own, and any other view registers
 * with `useTarget` from `@fusion.dev/helix-native`.
 *
 * **It shows while it is the stop the tour is on.** The tour writes
 * `current`, `first`, and `last` on it as it stands, over what the page
 * wrote. `type="dialog"` is a panel in the middle of the window, over the
 * tour's backdrop, `type="floating"` a panel in the corner at the end of
 * the window's bottom edge, and `type="wait"` shows nothing while the tour
 * waits for its target to be drawn.
 *
 * **Its controls are Skip, Back, and Next**, which a stop draws where
 * nothing is passed into `actions`: Back not on the first stop, and Next
 * labeled `done-label` on the last. A press on one sends `tour-ask` with
 * `what` it asks, and the tour answers it. The tour's labels stand over the
 * stop's own where it has them.
 *
 * **Its panel is a group, and a dialog for a dialog stop**, named by the
 * words passed into `heading`, then by `label`, and otherwise by its place
 * in the tour, such as "2 of 5". It is described by its place, which it
 * draws as well while the tour has `progress`. A phone says the panel's
 * name, its content, and its place as it shows.
 *
 * **The web's**: a name and a description taken from the first heading and
 * the leading words of the content, which a phone has no element to read
 * them from.
 *
 * **Held to `helix-tour-stop`.** `helix family check` compares the props,
 * the event, the states, the regions, and the parts with what the manifest
 * says the element has.
 */
export default headless('tour-stop', {
  props: {
    backLabel: 'Back',
    current: false,
    doneLabel: 'Done',
    effect: property(object()),
    first: false,
    for: '',
    label: '',
    last: false,
    nextLabel: 'Next',
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
      'bottom',
    ),
    skipLabel: 'Skip',
    type: oneOf(['dialog', 'floating', 'wait']),
  },
  events: {
    tourAsk: ['what'],
  },
  states: [
    'aligned-end',
    'aligned-start',
    'entering',
    'exiting',
    'placed-bottom',
    'placed-left',
    'placed-right',
    'placed-top',
    'settled',
  ],
  derived: {
    aim: derive('tour-stop-aim'),
    edge: derive('tour-stop-edge'),
  },
  stop: stop({
    asks: 'tour-ask',
    back: 'back',
    counted: 'counted',
    current: 'current',
    effect: 'effect',
    first: 'first',
    last: 'last',
    name: 'name',
    next: 'next',
    place: 'place',
    reach: 'reach',
    said: 'said',
    shown: 'shown',
    skip: 'skip',
    target: 'for',
    type: 'type',
    words: 'words',
  }),
  render: ({ derived, props, state, stop }) => (
    <Layer
      arrow="arrow"
      closedby="any"
      edge={derived.edge}
      enters="press"
      label={stop.name}
      offset={stop.reach}
      open={stop.shown}
      part="surface"
      placement={props.placement}
      role={props.type === 'dialog' ? 'dialog' : 'group'}
      target={derived.aim}
    >
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
      <Slot
        name="heading"
        part="heading"
      />
      <Slot
        name="description"
        part="description"
      />
      <View part="content">
        <Slot />
      </View>
      {stop.counted && (
        <View part="progress">
          <Text part="progress-words">{stop.place}</Text>
        </View>
      )}
      <View part="actions">
        <Slot name="actions">
          <Wrap
            draws="button"
            exports={{ button: true, live: true, spinner: true, text: true }}
            gives={{ emphasis: 'ghost' }}
            part="skip"
          >
            <Text part="skip-text">{stop.words.skip}</Text>
          </Wrap>
          {!props.first && (
            <Wrap
              draws="button"
              exports={{ button: true, live: true, spinner: true, text: true }}
              gives={{ emphasis: 'outlined' }}
              part="back"
            >
              <Text part="back-text">{stop.words.back}</Text>
            </Wrap>
          )}
          <Wrap
            draws="button"
            exports={{ button: true, live: true, spinner: true, text: true }}
            gives={{ emphasis: 'solid', tone: 'primary' }}
            part="next"
          >
            <Text part="next-text">{stop.words.next}</Text>
          </Wrap>
        </Slot>
      </View>
      <Announce
        arrives
        part="arrival"
        platform="native"
      >
        {stop.said}
      </Announce>
    </Layer>
  ),
})
