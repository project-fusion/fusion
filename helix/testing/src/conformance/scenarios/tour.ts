import { el, type PropValue, type Scenario } from '../format.js'

/*
 * The scenarios of Tour, a run of stops shown one at a time over the
 * controls they explain. The targets are buttons passed into the tour,
 * named by their `id`, which the web finds and a phone registers. Each stop
 * names itself by a `value` the harnesses know it by, which a stop does not
 * read. The page opens the tour by writing `open`, with focus on a control
 * of the page first, so a record says where focus goes as the tour opens
 * and where it comes back as it ends.
 */

/** A stop pointing at `target`, with these words, known by `value`. */
const stop = (
  value: string,
  target: string,
  words: string,
  props: Readonly<Record<string, PropValue>> = {},
) => el('helix-tour-stop', { for: target, value, ...props }, [words])

/** A tour over a Save and a Share button, holding these stops. */
const tour = (
  stops: readonly ReturnType<typeof stop>[],
  props: Readonly<Record<string, PropValue>> = {},
) =>
  el('helix-tour', { label: 'Getting started', ...props }, [
    el('helix-button', { id: 'save' }, ['Save']),
    el('helix-button', { id: 'share' }, ['Share']),
    ...stops,
  ])

/** Two stops, over Save and then Share. */
const two = [
  stop('saving', 'save', 'Save your work here.'),
  stop('sharing', 'share', 'Share it with your team.'),
]

/** Opening, with focus on the page first. */
const opening = [
  { kind: 'focus', page: true },
  { kind: 'set', prop: 'open', value: true },
] as const

/** Tours: moves, refusals, an ending of each kind, the keys, and a stop that waits. */
export const TOUR: readonly Scenario[] = [
  {
    family: 'tour',
    intents: [...opening],
    name: 'opening shows the first stop with focus on its panel',
    setup: tour(two),
  },
  {
    family: 'tour',
    intents: [
      ...opening,
      { item: 'saving', kind: 'press', part: 'next' },
      { item: 'sharing', kind: 'press', part: 'next' },
    ],
    name: 'Next goes on, and on the last stop finishes the tour',
    setup: tour(two),
  },
  {
    family: 'tour',
    intents: [...opening, { item: 'sharing', kind: 'press', part: 'back' }],
    name: 'Back goes to the stop before',
    setup: tour(two, { 'default-index': 1 }),
  },
  {
    family: 'tour',
    intents: [...opening, { item: 'saving', kind: 'press', part: 'skip' }],
    name: 'Skip asks before-close and ends the tour',
    setup: tour(two),
  },
  {
    family: 'tour',
    intents: [
      { event: 'before-activate', kind: 'refuse' },
      ...opening,
      { item: 'saving', kind: 'press', part: 'next' },
    ],
    name: 'a refused move stays on its stop',
    setup: tour(two),
  },
  {
    family: 'tour',
    intents: [...opening, { by: 'escape', kind: 'dismiss' }],
    name: 'a close request skips the tour',
    setup: tour(two),
  },
  {
    family: 'tour',
    intents: [
      { event: 'before-close', kind: 'refuse' },
      ...opening,
      { by: 'escape', kind: 'dismiss' },
    ],
    name: 'a refused skip keeps the tour open',
    setup: tour(two),
  },
  {
    family: 'tour',
    intents: [
      ...opening,
      { key: 'ArrowRight', kind: 'key' },
      { key: 'ArrowRight', kind: 'key' },
      { key: 'ArrowLeft', kind: 'key' },
    ],
    name: 'Right and Left from a stop go on and back, and never finish it',
    setup: tour(two),
  },
  {
    family: 'tour',
    intents: [...opening, { kind: 'set', prop: 'index', value: 1 }],
    name: 'writing the index moves with nothing sent',
    setup: tour(two),
  },
  {
    family: 'tour',
    intents: [...opening, { by: 'outside', kind: 'dismiss' }],
    name: 'a press outside does nothing by default',
    setup: tour(two),
  },
  {
    family: 'tour',
    intents: [...opening, { by: 'outside', kind: 'dismiss' }],
    name: 'a press outside ends the tour under outside-press="close"',
    setup: tour(two, { 'outside-press': 'close' }),
  },
  {
    family: 'tour',
    intents: [...opening, { item: 'late', kind: 'set', prop: 'id', value: 'later' }],
    name: 'a wait stop waits for its target, then moves on by itself',
    setup: el('helix-tour', { 'default-index': 1, label: 'Getting started' }, [
      /* Known by a value, so a record names the control focus waits on. */
      el('helix-button', { id: 'save', value: 'saver' }, ['Save']),
      el('helix-button', { value: 'late' }, ['Later']),
      stop('opening', 'save', 'Open the menu.'),
      el('helix-tour-stop', { for: 'later', type: 'wait', value: 'waiting' }, []),
      stop('after', 'later', 'Pick a file.'),
    ]),
  },
]
