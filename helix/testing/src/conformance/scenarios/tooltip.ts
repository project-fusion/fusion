import { el, type PropValue, type Scenario } from '../format.js'

/*
 * The scenarios of Tooltip, a layer placed against the trigger passed into
 * it. The page opens it by writing `open`, as a reader's pointer or long
 * press would, with focus on a control of the page first, so a record says
 * how each way of taking it down reaches it and that focus stays put.
 */

/** A tooltip that says what a save does, around the button it describes. */
const tooltip = (props: Readonly<Record<string, PropValue>> = {}) =>
  el('helix-tooltip', { content: 'Save your work', ...props }, [
    el('helix-button', { value: 'save' }, ['Save']),
  ])

/** Tooltips: a refused close request, a close request, a press outside, and a press on the trigger. */
export const TOOLTIP: readonly Scenario[] = [
  {
    family: 'tooltip',
    intents: [
      { kind: 'focus', page: true },
      { kind: 'set', prop: 'open', value: true },
      { event: 'before-close', kind: 'refuse' },
      { by: 'escape', kind: 'dismiss' },
    ],
    name: 'a refused close keeps it up',
    setup: tooltip(),
  },
  {
    family: 'tooltip',
    intents: [
      { kind: 'focus', page: true },
      { kind: 'set', prop: 'open', value: true },
      { by: 'escape', kind: 'dismiss' },
    ],
    name: 'a close request takes it down',
    setup: tooltip(),
  },
  {
    family: 'tooltip',
    intents: [
      { kind: 'focus', page: true },
      { kind: 'set', prop: 'open', value: true },
      { by: 'outside', kind: 'dismiss' },
    ],
    name: 'a press outside takes it down',
    setup: tooltip(),
  },
  {
    family: 'tooltip',
    intents: [
      { kind: 'focus', page: true },
      { kind: 'set', prop: 'open', value: true },
      { item: 'save', kind: 'press' },
    ],
    name: 'using the trigger takes it down',
    setup: tooltip(),
  },
  {
    family: 'tooltip',
    intents: [
      { kind: 'focus', page: true },
      { kind: 'set', prop: 'open', value: true },
      { item: 'save', kind: 'press' },
    ],
    name: 'using the trigger keeps it up under persist',
    setup: tooltip({ persist: true }),
  },
]
