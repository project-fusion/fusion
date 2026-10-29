import { el, type Scenario } from '../format.js'

/*
 * The scenarios of Number Input, a number a reader types and steps. Both
 * halves type it a character an edit, step it with the keys and the
 * steppers, and hold a stepper while the fake clock moves, and the
 * comparison holds the two records to each other: the events each edit and
 * step sends, the text the field shows, and whether it is marked wrong.
 */

/** A number input labeled Guests, with its props. */
const guests = (props: Readonly<Record<string, boolean | number | string>> = {}) =>
  el('helix-number-input', { label: 'Guests', ...props })

/** Number inputs: typing, settling, the keys, the steppers, a held stepper, a refusal, and inputs that take no step. */
export const NUMBER_INPUT: readonly Scenario[] = [
  {
    family: 'number-input',
    intents: [{ kind: 'type', text: '12' }, { kind: 'leave' }],
    name: 'each character asks, then sends input, and leaving sends change',
    setup: guests(),
  },
  {
    family: 'number-input',
    intents: [{ kind: 'type', text: '15' }, { kind: 'leave' }],
    name: 'a number typed past its largest is held to it as the reader leaves',
    setup: guests({ max: 10 }),
  },
  {
    family: 'number-input',
    intents: [{ kind: 'type', text: '7' }, { kind: 'leave' }],
    name: 'a number typed off its step lands on the nearest step as the reader leaves',
    setup: guests({ step: 5 }),
  },
  {
    family: 'number-input',
    intents: [{ kind: 'focus' }, { kind: 'leave' }],
    name: 'a value the page wrote off its step settles as the reader leaves',
    setup: guests({ step: 10, value: '57' }),
  },
  {
    family: 'number-input',
    intents: [
      { kind: 'focus' },
      { key: 'ArrowUp', kind: 'key' },
      { key: 'ArrowUp', kind: 'key' },
      { key: 'ArrowDown', kind: 'key' },
      { kind: 'leave' },
    ],
    name: 'each arrow steps the number and commits it',
    setup: guests({ 'default-value': '3' }),
  },
  {
    family: 'number-input',
    intents: [
      { kind: 'focus' },
      { key: 'PageUp', kind: 'key' },
      { key: 'PageDown', kind: 'key' },
      { key: 'End', kind: 'key' },
      { key: 'ArrowUp', kind: 'key' },
      { key: 'Home', kind: 'key' },
      { key: 'ArrowDown', kind: 'key' },
    ],
    name: 'Page keys take a large step, Home and End go to the ends, and nothing steps past them',
    setup: guests({ 'default-value': '10', 'large-step': 5, max: 50, min: 0, step: 2 }),
  },
  {
    family: 'number-input',
    intents: [{ kind: 'focus' }, { key: 'Home', kind: 'key' }, { key: 'End', kind: 'key' }],
    name: 'Home and End step nothing where the number has no ends',
    setup: guests({ 'default-value': '3' }),
  },
  {
    family: 'number-input',
    intents: [
      { kind: 'press', part: 'increment' },
      { kind: 'press', part: 'increment' },
      { kind: 'press', part: 'decrement' },
    ],
    name: 'each stepper steps the number and commits it',
    setup: guests({ 'default-value': '2' }),
  },
  {
    family: 'number-input',
    intents: [
      { kind: 'press', part: 'increment' },
      { kind: 'press', part: 'decrement' },
    ],
    name: 'a step from an empty field starts at its smallest',
    setup: guests({ min: 5 }),
  },
  {
    family: 'number-input',
    intents: [
      { kind: 'hold', ms: 580, part: 'increment' },
      { kind: 'wait', ms: 500 },
    ],
    name: 'a held stepper steps again after a delay and at each interval until it is let go',
    setup: guests({ 'default-value': '0' }),
  },
  {
    family: 'number-input',
    intents: [
      { kind: 'hold', ms: 1000, part: 'decrement' },
      { kind: 'hold', ms: 1000, part: 'decrement' },
    ],
    name: 'a held stepper stops at an end',
    setup: guests({ 'default-value': '4', min: 1 }),
  },
  {
    family: 'number-input',
    intents: [
      { event: 'before-change', kind: 'refuse' },
      { kind: 'press', part: 'increment' },
      { kind: 'focus' },
      { key: 'ArrowUp', kind: 'key' },
      { kind: 'type', text: '5' },
    ],
    name: 'a refused change leaves the number where it was',
    setup: guests({ 'default-value': '4' }),
  },
  {
    family: 'number-input',
    intents: [{ kind: 'type', text: '12a' }, { kind: 'leave' }, { erase: 1, kind: 'type' }],
    name: 'text that reads as no number stays and is marked wrong',
    setup: guests(),
  },
  {
    family: 'number-input',
    intents: [
      { kind: 'type', text: '1' },
      { kind: 'leave' },
      { erase: 1, kind: 'type' },
      { kind: 'leave' },
    ],
    name: 'a required number left empty is marked wrong once a change has given the reader a go',
    setup: guests({ required: true }),
  },
  {
    family: 'number-input',
    intents: [
      { kind: 'focus' },
      { kind: 'type', text: '5' },
      { kind: 'leave' },
      { kind: 'press', part: 'increment' },
    ],
    name: 'a number shows its format while the field has no focus',
    setup: guests({
      'default-value': '1200',
      'format-options': '{"style":"currency","currency":"USD"}',
      locale: 'en-US',
    }),
  },
  {
    family: 'number-input',
    intents: [
      { kind: 'press', part: 'increment' },
      { kind: 'hold', ms: 500, part: 'decrement' },
      { kind: 'type', text: '1' },
    ],
    name: 'a disabled number takes no step and no edit',
    setup: guests({ 'default-value': '4', disabled: true }),
  },
  {
    family: 'number-input',
    intents: [
      { kind: 'press', part: 'increment' },
      { kind: 'focus' },
      { key: 'ArrowUp', kind: 'key' },
      { kind: 'type', text: '1' },
      { kind: 'leave' },
    ],
    name: 'a read-only number takes focus and no step or edit',
    setup: guests({ 'default-value': '4', readonly: true }),
  },
]
