import { el, type Scenario } from '../format.js'

/*
 * The scenarios of Popover, a layer placed against its trigger. The page
 * opens it by writing `open`, with focus on a control of the page first, so
 * a record says where focus goes as it opens and where it comes back.
 */

/** A popover of filters, opened from its trigger. */
const popover = el('helix-popover', { label: 'Filters' }, [
  el('helix-button', {}, ['Filters'], 'trigger'),
  'Show archived files',
])

/** Popovers: a close request, a press outside, and a refusal. */
export const POPOVER: readonly Scenario[] = [
  {
    family: 'popover',
    intents: [
      { kind: 'focus', page: true },
      { kind: 'set', prop: 'open', value: true },
      { by: 'escape', kind: 'dismiss' },
    ],
    name: 'a close request closes it',
    setup: popover,
  },
  {
    family: 'popover',
    intents: [
      { kind: 'focus', page: true },
      { kind: 'set', prop: 'open', value: true },
      { by: 'outside', kind: 'dismiss' },
    ],
    name: 'a press outside closes it',
    setup: popover,
  },
  {
    family: 'popover',
    intents: [
      { kind: 'set', prop: 'open', value: true },
      { event: 'before-close', kind: 'refuse' },
      { by: 'outside', kind: 'dismiss' },
    ],
    name: 'a refused close keeps it open',
    setup: popover,
  },
]
