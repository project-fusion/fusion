import { el, type Scenario, type Setup } from '../format.js'

/*
 * Toggle Group's scenarios. Where one is chosen, the group runs single
 * selection with roving focus, and its toggles are radios; where several can
 * be pressed, each toggle presses on its own and the keys only move focus.
 */

/** A toggle: its value, its words, and its props beside `value`. */
type Item = readonly [value: string, words: string, props?: Setup['props']]

/** A toggle group with these toggles. */
const group = (props: Setup['props'], items: readonly Item[]): Setup =>
  el(
    'helix-toggle-group',
    { label: 'View', ...props },
    items.map(([value, words, own]) => el('helix-toggle', { value, ...own }, [words])),
  )

/** Three views, the last of them disabled. */
const LAST_OFF: readonly Item[] = [
  ['list', 'List'],
  ['grid', 'Grid'],
  ['board', 'Board', { disabled: true }],
]

/** Three views a reader can reach. */
const THREE: readonly Item[] = [
  ['list', 'List'],
  ['grid', 'Grid'],
  ['board', 'Board'],
]

/** Toggle groups: choosing, refusal, the keys, taking a choice back, and pressing several. */
export const TOGGLE_GROUP: readonly Scenario[] = [
  {
    family: 'toggle-group',
    intents: [
      { item: 'grid', kind: 'press' },
      { item: 'grid', kind: 'press' },
      { item: 'board', kind: 'press' },
      { item: 'list', kind: 'press' },
    ],
    name: 'a press chooses a toggle, keeps the chosen one, and passes over a disabled one',
    setup: group({}, LAST_OFF),
  },
  {
    family: 'toggle-group',
    intents: [
      { event: 'before-select', kind: 'refuse' },
      { item: 'grid', kind: 'press' },
    ],
    name: 'a refused before-select keeps the choice',
    setup: group({ 'default-value': 'list' }, THREE),
  },
  {
    family: 'toggle-group',
    intents: [
      { event: 'before-change', kind: 'refuse' },
      { item: 'grid', kind: 'press' },
    ],
    name: 'a refused change keeps the choice',
    setup: group({ 'default-value': 'list' }, THREE),
  },
  {
    family: 'toggle-group',
    intents: [
      { item: 'list', kind: 'focus' },
      { key: 'ArrowRight', kind: 'key' },
      { key: 'ArrowRight', kind: 'key' },
      { key: 'ArrowLeft', kind: 'key' },
      { key: 'End', kind: 'key' },
      { key: 'Home', kind: 'key' },
      { key: 'ArrowUp', kind: 'key' },
      { key: 'ArrowDown', kind: 'key' },
    ],
    name: 'the arrows choose where they arrive, come round, and pass over a disabled toggle',
    setup: group({ 'default-value': 'list' }, LAST_OFF),
  },
  {
    family: 'toggle-group',
    intents: [
      { item: 'grid', kind: 'press' },
      { item: 'grid', kind: 'press' },
      { item: 'list', kind: 'press' },
    ],
    name: 'a press on the chosen toggle takes it back under allow-empty-selection',
    setup: group({ 'allow-empty-selection': true }, THREE),
  },
  {
    family: 'toggle-group',
    intents: [{ item: 'grid', kind: 'press' }],
    name: 'a disabled group takes no press',
    setup: group({ 'default-value': 'list', disabled: true }, THREE),
  },
  {
    family: 'toggle-group',
    intents: [
      { item: 'list', kind: 'press' },
      { item: 'board', kind: 'press' },
      { item: 'list', kind: 'press' },
    ],
    name: 'a press presses or releases one toggle where several can be pressed',
    setup: group({ 'selection-mode': 'multiple' }, THREE),
  },
  {
    family: 'toggle-group',
    intents: [
      { item: 'list', kind: 'focus' },
      { key: 'ArrowRight', kind: 'key' },
      { key: ' ', kind: 'key' },
      { key: 'ArrowRight', kind: 'key' },
      { key: 'Enter', kind: 'key' },
      { key: 'Home', kind: 'key' },
    ],
    name: 'the arrows move focus where several can be pressed, and Space and Enter press',
    setup: group({ 'selection-mode': 'multiple' }, THREE),
  },
  {
    family: 'toggle-group',
    intents: [
      { event: 'before-change', kind: 'refuse' },
      { item: 'grid', kind: 'press' },
    ],
    name: 'a refused change leaves the pressed toggles as they were',
    setup: group({ 'selection-mode': 'multiple', value: 'list' }, THREE),
  },
]
