import type { Scenario, Setup } from '../format.js'

/*
 * The scenarios of Canvas, a board of cards and the connections between
 * them. Both halves press a card, a connection's target, and the zoom
 * controls, and the comparison holds the two records to each other: each
 * `before-select` and `select` a press sends, each `canvas-zoom` a control
 * sends, and what a screen reader hears. The view a board reports,
 * `canvas-view`, is measured in each platform's own box, and left out.
 */

/**
 * A card at a place, with its words. Its `value`, which a card does not
 * read, is what both harnesses find it by, as a light-DOM child of the
 * board.
 */
const card = (name: string, x: number, y: number, words: string, tone?: string): Setup => ({
  children: [words],
  props: {
    height: 64,
    name,
    value: name,
    width: 160,
    x,
    y,
    ...(tone === undefined ? {} : { tone }),
  },
  tag: 'helix-canvas-node',
})

/** A connection between two cards. */
const edge = (from: string, to: string, label?: string): Setup => ({
  props: { from, to, ...(label === undefined ? {} : { label }) },
  tag: 'helix-canvas-edge',
})

/** Three cards and two connections, with the board's props. */
const board = (props: Readonly<Record<string, boolean | number | string>> = {}): Setup => ({
  children: [
    card('write', 0, 0, 'Write the draft'),
    card('review', 320, 0, 'Review the draft', 'accent'),
    card('ship', 160, 200, 'Publish the draft', 'success'),
    edge('write', 'review', 'when it is complete'),
    edge('review', 'ship'),
  ],
  props: { label: 'Document approval', ...props },
  tag: 'helix-canvas',
})

/** Boards: a card and a connection selected, one refused, and a zoom control. */
export const CANVAS: readonly Scenario[] = [
  {
    family: 'canvas',
    intents: [
      { item: 'review', kind: 'press' },
      { item: 'write', kind: 'press' },
    ],
    name: 'a card pressed asks for the selection, then selects it',
    setup: board(),
  },
  {
    family: 'canvas',
    intents: [{ kind: 'press', label: 'From Write the draft to Review the draft' }],
    name: 'a connection pressed asks for the selection by its ends, then selects it',
    setup: board(),
  },
  {
    family: 'canvas',
    intents: [
      { event: 'before-select', kind: 'refuse' },
      { item: 'write', kind: 'press' },
    ],
    name: 'a selection the page refuses leaves the selected card',
    setup: board({ selected: 'review' }),
  },
  {
    family: 'canvas',
    intents: [
      { kind: 'press', label: 'Zoom in' },
      { kind: 'press', label: 'Zoom out' },
    ],
    name: 'the zoom controls zoom by a quarter and say the zoom',
    setup: board(),
  },
]
