import { el, type Scenario, type Setup } from '../format.js'

/*
 * Button Group's scenarios. In a selection mode each button with a value
 * stays pressed: under `multiple` each presses on its own and the group holds
 * the pressed values in the order they were pressed, separated by a comma and
 * a space, and under `single` one is pressed at a time. The arrow keys move
 * focus among the buttons and press nothing.
 */

/** A button: its value and its words. */
type Item = readonly [value: string, words: string]

/** A button group with these buttons. */
const group = (props: Setup['props'], items: readonly Item[]): Setup =>
  el(
    'helix-button-group',
    { label: 'Text style', ...props },
    items.map(([value, words]) => el('helix-button', { value }, [words])),
  )

/** Three text styles. */
const STYLES: readonly Item[] = [
  ['bold', 'Bold'],
  ['italic', 'Italic'],
  ['underline', 'Underline'],
]

/** Button groups: pressing several, pressing one, keeping one, refusal, and the keys. */
export const BUTTON_GROUP: readonly Scenario[] = [
  {
    family: 'button-group',
    intents: [
      { item: 'italic', kind: 'press' },
      { item: 'bold', kind: 'press' },
      { item: 'italic', kind: 'press' },
    ],
    name: 'a press presses or releases one button where several can be pressed',
    setup: group({ 'selection-mode': 'multiple' }, STYLES),
  },
  {
    family: 'button-group',
    intents: [
      { item: 'bold', kind: 'press' },
      { item: 'italic', kind: 'press' },
      { item: 'italic', kind: 'press' },
    ],
    name: 'a press chooses one button where one is pressed, and a press on it lets it go',
    setup: group({ 'selection-mode': 'single' }, STYLES),
  },
  {
    family: 'button-group',
    intents: [{ item: 'bold', kind: 'press' }],
    name: 'a press on the one pressed button keeps it under disallow-empty-selection',
    setup: group(
      { 'disallow-empty-selection': true, 'selection-mode': 'single', value: 'bold' },
      STYLES,
    ),
  },
  {
    family: 'button-group',
    intents: [
      { event: 'before-change', kind: 'refuse' },
      { item: 'italic', kind: 'press' },
    ],
    name: 'a refused change leaves the pressed buttons as they were',
    setup: group({ 'selection-mode': 'multiple', value: 'bold' }, STYLES),
  },
  {
    family: 'button-group',
    intents: [
      { item: 'bold', kind: 'focus' },
      { key: 'ArrowRight', kind: 'key' },
      { key: ' ', kind: 'key' },
      { key: 'ArrowRight', kind: 'key' },
      { key: 'ArrowRight', kind: 'key' },
      { key: 'Enter', kind: 'key' },
    ],
    name: 'the arrows move focus without pressing, come round, and Space and Enter press',
    setup: group({ 'selection-mode': 'multiple' }, STYLES),
  },
]
