import { el, type Scenario, type Setup } from '../format.js'

/*
 * The scenarios of Speed Dial, a layer of actions placed against its
 * trigger. The page opens it by writing `open`, with focus on a control of
 * the page first, so a record says where focus goes as an action is chosen
 * and as the dial closes.
 */

/** A dial of three actions, opened from a trigger of the page's. */
const dial = (props: Setup['props'] = {}): Setup =>
  el('helix-speed-dial', { label: 'Actions', ...props }, [
    el('helix-button', {}, ['Open actions'], 'trigger'),
    el('helix-speed-dial-item', { value: 'share' }, ['Share']),
    el('helix-speed-dial-item', { value: 'copy' }, ['Duplicate']),
    el('helix-speed-dial-item', { value: 'delete' }, ['Delete']),
  ])

/** Speed dials: a choice, a refused choice, the keys, a close request, a press outside, and a refused close. */
export const SPEED_DIAL: readonly Scenario[] = [
  {
    family: 'speed-dial',
    intents: [
      { kind: 'focus', page: true },
      { kind: 'set', prop: 'open', value: true },
      { item: 'copy', kind: 'press' },
    ],
    name: 'choosing an action sends select and closes the dial',
    setup: dial(),
  },
  {
    family: 'speed-dial',
    intents: [
      { kind: 'set', prop: 'open', value: true },
      { event: 'select', kind: 'refuse' },
      { item: 'copy', kind: 'press' },
    ],
    name: 'a refused choice keeps the dial open',
    setup: dial(),
  },
  {
    family: 'speed-dial',
    intents: [
      { kind: 'set', prop: 'open', value: true },
      { item: 'share', kind: 'focus' },
      { key: 'ArrowDown', kind: 'key' },
      { key: 'End', kind: 'key' },
      { key: 'ArrowDown', kind: 'key' },
      { key: 'ArrowUp', kind: 'key' },
    ],
    name: 'the arrow keys move among the actions, coming round at the ends',
    setup: dial(),
  },
  {
    family: 'speed-dial',
    intents: [
      { kind: 'focus', page: true },
      { kind: 'set', prop: 'open', value: true },
      { by: 'escape', kind: 'dismiss' },
    ],
    name: 'a close request closes it',
    setup: dial(),
  },
  {
    family: 'speed-dial',
    intents: [
      { kind: 'set', prop: 'open', value: true },
      { by: 'outside', kind: 'dismiss' },
    ],
    name: 'a press outside closes it',
    setup: dial(),
  },
  {
    family: 'speed-dial',
    intents: [
      { kind: 'focus', page: true },
      { kind: 'set', prop: 'open', value: true },
      { event: 'before-close', kind: 'refuse' },
      { by: 'escape', kind: 'dismiss' },
    ],
    name: 'a refused close keeps it open',
    setup: dial(),
  },
]
