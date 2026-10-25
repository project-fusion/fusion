import {
  bind,
  box,
  derive,
  event,
  headless,
  layer,
  live,
  pick,
  prop,
  region,
  stop,
  text,
  unless,
  when,
  wrap,
} from '../../../tree.js'

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
  derived: {
    aim: derive('tour-stop-aim'),
    edge: derive('tour-stop-edge'),
  },
  events: [event('tour-ask', { detail: ['what'] })],
  props: [
    prop('back-label', 'string', { default: 'Back' }),
    prop('current', 'boolean', { default: false }),
    prop('done-label', 'string', { default: 'Done' }),
    prop('effect', 'object', { attribute: false }),
    prop('first', 'boolean', { default: false }),
    prop('for', 'string', { default: '' }),
    prop('label', 'string', { default: '' }),
    prop('last', 'boolean', { default: false }),
    prop('next-label', 'string', { default: 'Next' }),
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
      { default: 'bottom' },
    ),
    prop('skip-label', 'string', { default: 'Skip' }),
    prop('type', ['dialog', 'floating', 'wait']),
  ],
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
  tree: [
    layer(
      'surface',
      {
        arrow: 'arrow',
        closedby: 'any',
        edge: bind('edge'),
        enters: 'press',
        label: bind('name'),
        offset: bind('reach'),
        open: bind('shown'),
        placement: bind('placement'),
        role: pick('type', { dialog: 'dialog' }, 'group'),
        target: bind('aim'),
      },
      [
        box('arrow', {
          also: {
            'arrow-bottom': bind('placed-bottom'),
            'arrow-left': bind('placed-left'),
            'arrow-right': bind('placed-right'),
            'arrow-top': bind('placed-top'),
          },
          decorative: true,
        }),
        region('heading', { part: 'heading' }),
        region('description', { part: 'description' }),
        box('content', {}, [region('default')]),
        when('counted', box('progress', {}, [text('progress-words', { says: bind('place') })])),
        box('actions', {}, [
          region('actions', {}, [
            wrap(
              'skip',
              {
                draws: 'button',
                exports: { button: true, live: true, spinner: true, text: true },
                gives: { emphasis: 'ghost' },
                while: true,
              },
              [text('skip-text', { says: bind('skip-words') })],
            ),
            unless(
              'first',
              wrap(
                'back',
                {
                  draws: 'button',
                  exports: { button: true, live: true, spinner: true, text: true },
                  gives: { emphasis: 'outlined' },
                  while: true,
                },
                [text('back-text', { says: bind('back-words') })],
              ),
            ),
            wrap(
              'next',
              {
                draws: 'button',
                exports: { button: true, live: true, spinner: true, text: true },
                gives: { emphasis: 'solid', tone: 'primary' },
                while: true,
              },
              [text('next-text', { says: bind('next-words') })],
            ),
          ]),
        ]),
        live('arrival', { arrives: true, platform: 'native', says: bind('said') }),
      ],
    ),
  ],
})
