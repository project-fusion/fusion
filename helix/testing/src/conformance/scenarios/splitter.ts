import { el, type Scenario } from '../format.js'

/*
 * The scenarios of Splitter, two panes and a divider a reader moves between
 * them. Both halves drag the divider to a point along the splitter, as a
 * finger carries it there, and move it with the keys, and the comparison
 * holds the two records to each other: the events each move and each
 * collapse send, and where the divider stands.
 */

/** A splitter with a pane of words on each side, with its props. */
const split = (props: Readonly<Record<string, boolean | number | string>> = {}) =>
  el('helix-splitter', props, [
    el('helix-text', {}, ['Files'], 'start'),
    el('helix-text', {}, ['Editor'], 'end'),
  ])

/** Splitters: drags, the keys, the bounds, collapsing, refusals, and panes one above the other. */
export const SPLITTER: readonly Scenario[] = [
  {
    family: 'splitter',
    intents: [
      { kind: 'slide', to: 0.25 },
      { kind: 'slide', to: 0.75 },
    ],
    name: 'a drag carries the divider to where it lets go',
    setup: split(),
  },
  {
    family: 'splitter',
    intents: [
      { kind: 'focus' },
      { key: 'ArrowRight', kind: 'key' },
      { key: 'ArrowRight', kind: 'key' },
      { key: 'ArrowLeft', kind: 'key' },
      { key: 'ArrowDown', kind: 'key' },
    ],
    name: 'the arrows along its axis move the divider by a step, and the others do nothing',
    setup: split({ 'default-position': 40, step: 5 }),
  },
  {
    family: 'splitter',
    intents: [
      { kind: 'focus' },
      { key: 'Home', kind: 'key' },
      { key: 'ArrowLeft', kind: 'key' },
      { key: 'End', kind: 'key' },
      { key: 'End', kind: 'key' },
    ],
    name: 'Home and End take the divider to its bounds, and nothing moves it past them',
    setup: split({ 'default-position': 40, max: 70, min: 20 }),
  },
  {
    family: 'splitter',
    intents: [{ kind: 'focus' }, { key: 'End', kind: 'key' }],
    name: 'the end pane keeps the least its end-min holds',
    setup: split({ 'end-min': 25 }),
  },
  {
    family: 'splitter',
    intents: [{ kind: 'focus' }, { key: 'Enter', kind: 'key' }, { key: 'Enter', kind: 'key' }],
    name: 'Enter shuts the start pane and opens it back to where the divider stood',
    setup: split({ 'default-position': 40 }),
  },
  {
    family: 'splitter',
    intents: [{ kind: 'focus' }, { key: 'Enter', kind: 'key' }],
    name: 'Enter shuts the end pane where only that one may shut',
    setup: split({ collapsible: 'end' }),
  },
  {
    family: 'splitter',
    intents: [
      { kind: 'focus' },
      { key: 'Enter', kind: 'key' },
      { key: 'Home', kind: 'key' },
      { key: 'Enter', kind: 'key' },
    ],
    name: 'a pane that may not shut stays open at the edge',
    setup: split({ collapsible: 'none' }),
  },
  {
    family: 'splitter',
    intents: [{ kind: 'slide', to: 1 }, { kind: 'focus' }, { key: 'Enter', kind: 'key' }],
    name: 'a drag to the edge shuts the pane down to its collapsed size',
    setup: split({ 'collapsed-size': 8 }),
  },
  {
    family: 'splitter',
    intents: [
      { event: 'before-resize', kind: 'refuse' },
      { kind: 'focus' },
      { key: 'ArrowRight', kind: 'key' },
      { key: 'End', kind: 'key' },
    ],
    name: 'a refused resize leaves the divider where it was',
    setup: split({ 'default-position': 40 }),
  },
  {
    family: 'splitter',
    intents: [
      { event: 'before-collapse', kind: 'refuse' },
      { kind: 'focus' },
      { key: 'Enter', kind: 'key' },
      { key: 'Home', kind: 'key' },
    ],
    name: 'a refused collapse leaves the pane open, and the divider where a key took it',
    setup: split({ 'default-position': 40 }),
  },
  {
    family: 'splitter',
    intents: [{ kind: 'focus' }, { key: 'Enter', kind: 'key' }, { key: 'ArrowLeft', kind: 'key' }],
    name: 'a pane shut from the start opens to the default position',
    setup: split({ 'default-collapsed': 'start', 'default-position': 30 }),
  },
  {
    family: 'splitter',
    intents: [
      { kind: 'focus' },
      { key: 'ArrowRight', kind: 'key' },
      { key: 'ArrowDown', kind: 'key' },
      { key: 'ArrowUp', kind: 'key' },
      { key: 'ArrowUp', kind: 'key' },
      { kind: 'slide', to: 0.75 },
    ],
    name: 'panes one above the other move the divider with the up and down arrows and a drag down',
    setup: split({ orientation: 'vertical' }),
  },
]
