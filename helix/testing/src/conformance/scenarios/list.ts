import { el, type Scenario, type Setup } from '../format.js'

/** A row: its value, its words, and its props beside `value`. */
type Row = readonly [value: string, words: string, props?: Setup['props']]

/** A list with these rows. */
const list = (props: Setup['props'], rows: readonly Row[] = THREE): Setup =>
  el(
    'helix-list',
    { label: 'Groceries', ...props },
    rows.map(([value, words, own]) => el('helix-list-item', { value, ...own }, [words])),
  )

/** Three rows a reader can reach. */
const THREE: readonly Row[] = [
  ['a', 'Apples'],
  ['b', 'Bread'],
  ['c', 'Cheese'],
]

/**
 * Lists: choosing one row or many, toggle and replace, the keys, refusal, a
 * list that acts, disabled rows, links, and moving a row.
 */
export const LIST: readonly Scenario[] = [
  {
    family: 'list',
    intents: [
      { item: 'b', kind: 'press' },
      { item: 'a', kind: 'press' },
      { item: 'a', kind: 'press' },
    ],
    name: 'a single list chooses the row pressed, and a second press lets it go',
    setup: list({ 'selection-mode': 'single' }),
  },
  {
    family: 'list',
    intents: [
      { item: 'a', kind: 'press' },
      { item: 'c', kind: 'press' },
      { item: 'a', kind: 'press' },
    ],
    name: 'a multiple list adds and takes out the row pressed',
    setup: list({ 'selection-mode': 'multiple' }),
  },
  {
    family: 'list',
    intents: [
      { item: 'a', kind: 'press' },
      { item: 'b', kind: 'press' },
      { item: 'b', kind: 'press' },
      { held: { toggle: true }, item: 'c', kind: 'press' },
    ],
    name: 'replace chooses the row pressed alone, and toggle adds one',
    setup: list({ 'selection-behavior': 'replace', 'selection-mode': 'multiple' }),
  },
  {
    family: 'list',
    intents: [
      { item: 'a', kind: 'press' },
      { held: { shift: true }, item: 'c', kind: 'press' },
    ],
    name: 'shift takes in the rows from the last one pressed',
    setup: list({ 'selection-mode': 'multiple' }),
  },
  {
    family: 'list',
    intents: [
      { item: 'd', kind: 'press' },
      { item: 'a', kind: 'press' },
      { item: 'a', kind: 'focus' },
      { held: { shift: true }, key: 'ArrowDown', kind: 'key' },
      { held: { shift: true }, key: 'ArrowDown', kind: 'key' },
      { held: { shift: true }, key: 'ArrowUp', kind: 'key' },
      { held: { shift: true }, key: 'ArrowUp', kind: 'key' },
    ],
    name: 'Shift back toward the anchor lets go of the rows the range passed, and keeps the rest',
    setup: list({ 'selection-mode': 'multiple' }, [...THREE, ['d', 'Dates']]),
  },
  {
    family: 'list',
    intents: [
      { item: 'a', kind: 'focus' },
      { held: { toggle: true }, key: ' ', kind: 'key' },
      { key: 'ArrowDown', kind: 'key' },
      { held: { toggle: true }, key: ' ', kind: 'key' },
      { held: { toggle: true }, key: ' ', kind: 'key' },
    ],
    name: 'Control with Space adds or takes out the row under toggle',
    setup: list({ 'selection-mode': 'multiple' }),
  },
  {
    family: 'list',
    intents: [
      { item: 'a', kind: 'focus' },
      { key: 'ArrowDown', kind: 'key' },
      { key: 'ArrowDown', kind: 'key' },
      { key: 'ArrowDown', kind: 'key' },
      { key: 'Home', kind: 'key' },
      { key: 'End', kind: 'key' },
      { key: 'ArrowUp', kind: 'key' },
      { key: 'ArrowRight', kind: 'key' },
      { key: 'ArrowLeft', kind: 'key' },
    ],
    name: 'the arrows move focus, stop at the ends, and leave Left and Right to the row',
    setup: list({ 'selection-mode': 'single' }),
  },
  {
    family: 'list',
    intents: [
      { item: 'a', kind: 'focus' },
      { key: 'c', kind: 'key' },
      { key: 'b', kind: 'key' },
    ],
    name: 'a letter moves focus to the row whose words start with it, and chooses nothing',
    setup: list({ 'selection-mode': 'single' }),
  },
  {
    family: 'list',
    intents: [
      { item: 'a', kind: 'focus' },
      { key: ' ', kind: 'key' },
      { key: 'ArrowDown', kind: 'key' },
      { key: 'Enter', kind: 'key' },
      { key: 'Escape', kind: 'key' },
    ],
    name: 'Space chooses the row with focus, Enter acts on it, and Escape lets go',
    setup: list({ 'selection-mode': 'single' }),
  },
  {
    family: 'list',
    intents: [
      { item: 'a', kind: 'focus' },
      { key: 'ArrowDown', kind: 'key' },
      { key: 'ArrowDown', kind: 'key' },
    ],
    name: 'under replace the arrows choose the row they arrive on',
    setup: list({ 'selection-behavior': 'replace', 'selection-mode': 'multiple' }),
  },
  {
    family: 'list',
    intents: [
      { item: 'a', kind: 'focus' },
      { held: { toggle: true }, key: 'a', kind: 'key' },
    ],
    name: 'toggle with A chooses every row',
    setup: list({ 'selection-mode': 'multiple' }),
  },
  {
    family: 'list',
    intents: [
      { event: 'before-change', kind: 'refuse' },
      { item: 'b', kind: 'press' },
    ],
    name: 'a refused change keeps the rows chosen',
    setup: list({ 'selection-mode': 'single', value: 'a' }),
  },
  {
    family: 'list',
    intents: [
      { item: 'a', kind: 'press' },
      { item: 'a', kind: 'focus' },
      { key: 'Enter', kind: 'key' },
    ],
    name: 'a list that chooses nothing acts on the row pressed',
    setup: list({ 'selection-mode': 'none' }),
  },
  {
    family: 'list',
    intents: [
      { item: 'b', kind: 'press' },
      { item: 'a', kind: 'focus' },
      { key: 'ArrowDown', kind: 'key' },
    ],
    name: 'a disabled row is not chosen, and the arrows pass over it',
    setup: list({ 'selection-mode': 'single' }, [
      ['a', 'Apples'],
      ['b', 'Bread', { disabled: true }],
      ['c', 'Cheese'],
    ]),
  },
  {
    family: 'list',
    intents: [
      { item: 'b', kind: 'press' },
      { item: 'a', kind: 'press' },
    ],
    name: 'a disabled row is acted on where it is out of the selection alone',
    setup: list({ 'disabled-behavior': 'selection', 'selection-mode': 'single' }, [
      ['a', 'Apples'],
      ['b', 'Bread', { disabled: true }],
    ]),
  },
  {
    family: 'list',
    intents: [{ item: 'b', kind: 'press' }],
    name: 'a row that is a link opens it',
    setup: list({ 'selection-mode': 'none' }, [
      ['a', 'Apples'],
      ['b', 'Bread', { href: 'https://example.com/bread' }],
    ]),
  },
  {
    family: 'list',
    intents: [
      { item: 'b', kind: 'press' },
      { item: 'a', kind: 'press' },
    ],
    name: 'a row that is a link opens it and is not chosen in a list that chooses',
    setup: list({ 'selection-mode': 'multiple' }, [
      ['a', 'Apples'],
      ['b', 'Bread', { href: 'https://example.com/bread' }],
    ]),
  },
  {
    family: 'list',
    intents: [
      { by: 1, item: 'a', kind: 'move' },
      { event: 'before-reorder', kind: 'refuse' },
      { by: -1, item: 'c', kind: 'move' },
    ],
    name: 'a row moves one place without a pointer, unless the move is refused',
    setup: list({ reorderable: true }),
  },
  {
    family: 'list',
    intents: [{ edge: 'after', item: 'a', kind: 'drag', to: 'c' }],
    name: 'a row dragged by its grip lands beside another',
    setup: list({ reorderable: true }),
  },
]
