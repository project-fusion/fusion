import { el, type Scenario, type Setup } from '../format.js'

/*
 * Checkbox Group's scenarios. Each box turns on its own, and asks the group
 * before it turns: the group's `before-change` carries the whole set, and
 * the group tells its own change before the box tells its.
 */

/** A box: its value, its words, and its props beside `value`. */
type Box = readonly [value: string, words: string, props?: Setup['props']]

/** A checkbox group with these boxes. */
const group = (props: Setup['props'], boxes: readonly Box[]): Setup =>
  el(
    'helix-checkbox-group',
    { label: 'Notify me', ...props },
    boxes.map(([value, words, own]) => el('helix-checkbox', { value, ...own }, [words])),
  )

/** Three channels a reader can turn. */
const THREE: readonly Box[] = [
  ['email', 'Email'],
  ['text', 'Text'],
  ['push', 'Push'],
]

/** Checkbox groups: a press, Space, refusal, and a disabled group. */
export const CHECKBOX_GROUP: readonly Scenario[] = [
  {
    family: 'checkbox-group',
    intents: [
      { item: 'email', kind: 'press' },
      { item: 'push', kind: 'press' },
      { item: 'email', kind: 'press' },
    ],
    name: 'a press turns one box, and the group tells the whole set',
    setup: group({}, THREE),
  },
  {
    family: 'checkbox-group',
    intents: [
      { item: 'text', kind: 'focus' },
      { key: ' ', kind: 'key' },
      { key: 'Enter', kind: 'key' },
      { key: ' ', kind: 'key' },
    ],
    name: 'Space turns the box with focus, and Enter leaves it',
    setup: group({}, THREE),
  },
  {
    family: 'checkbox-group',
    intents: [
      { event: 'before-change', kind: 'refuse' },
      { item: 'text', kind: 'press' },
    ],
    name: 'a refused change keeps the box as it was',
    setup: group({ value: 'email' }, THREE),
  },
  {
    family: 'checkbox-group',
    intents: [{ item: 'email', kind: 'press' }],
    name: 'a disabled group takes no press',
    setup: group({ disabled: true }, THREE),
  },
]
