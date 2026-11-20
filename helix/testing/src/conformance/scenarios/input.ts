import { el, type Scenario } from '../format.js'

/*
 * The scenarios of Input, which a reader types into. Both halves type each
 * character as its own edit, and the comparison holds the two records to
 * each other: the events each edit sends, the text the field holds, and
 * whether the element is marked wrong.
 *
 * **No scenario holds `minlength` or `maxlength`.** HTML checks them only
 * against a reader's own edits, and the web half's edits are a script's, so
 * a browser never reports them there. The native spec and a typed check in
 * Chromium cover them.
 */

/** An input labeled Name, with its props. */
const field = (props: Readonly<Record<string, boolean | number | string>> = {}) =>
  el('helix-input', { label: 'Name', ...props })

/** Inputs: typing, erasing, refusing, clearing, validation, and a field that takes no edit. */
export const INPUT: readonly Scenario[] = [
  {
    family: 'input',
    intents: [
      { kind: 'press', part: 'reveal' },
      { kind: 'type', text: 'a' },
      { kind: 'press', part: 'reveal' },
    ],
    name: 'the reveal button shows and hides a password, and sends nothing',
    setup: field({ 'default-value': 'hunter2', reveal: true, type: 'password' }),
  },
  {
    family: 'input',
    intents: [
      { kind: 'focus' },
      { key: 'ArrowUp', kind: 'key' },
      { key: 'ArrowDown', kind: 'key' },
      { key: 'ArrowDown', kind: 'key' },
    ],
    name: 'the arrows step a number by its step',
    setup: field({ 'default-value': '10', step: 5, type: 'number' }),
  },
  {
    family: 'input',
    intents: [{ kind: 'focus' }, { key: 'ArrowUp', kind: 'key' }, { key: 'ArrowUp', kind: 'key' }],
    name: 'the arrows keep a number within max, on the step from min',
    setup: field({ 'default-value': '8', max: 10, min: 1, step: 3, type: 'number' }),
  },
  {
    family: 'input',
    intents: [{ kind: 'focus' }, { key: 'ArrowUp', kind: 'key' }],
    name: 'an empty number steps from nothing to min',
    setup: field({ min: 5, type: 'number' }),
  },
  {
    family: 'input',
    intents: [{ kind: 'type', text: '20' }, { kind: 'leave' }],
    name: 'a number above max is wrong once the reader leaves it',
    setup: field({ max: 10, type: 'number' }),
  },
  {
    family: 'input',
    intents: [{ kind: 'type', text: '2' }, { kind: 'leave' }],
    name: 'a number below min is wrong once the reader leaves it',
    setup: field({ min: 10, type: 'number' }),
  },
  {
    family: 'input',
    intents: [{ kind: 'type', text: '3' }, { kind: 'leave' }],
    name: 'a number off its step is wrong once the reader leaves it',
    setup: field({ step: 2, type: 'number' }),
  },
  {
    family: 'input',
    intents: [{ kind: 'type', text: 'Ada' }, { kind: 'leave' }],
    name: 'each character asks, then sends input, and leaving sends change',
    setup: field(),
  },
  {
    family: 'input',
    intents: [{ erase: 2, kind: 'type' }, { kind: 'leave' }],
    name: 'erasing from the end is an edit a character',
    setup: field({ 'default-value': 'Grace' }),
  },
  {
    family: 'input',
    intents: [{ kind: 'type', text: 'A' }, { erase: 1, kind: 'type' }, { kind: 'leave' }],
    name: 'leaving with the text it gained focus with sends no change',
    setup: field(),
  },
  {
    family: 'input',
    intents: [
      { event: 'before-change', kind: 'refuse' },
      { kind: 'type', text: 'x' },
    ],
    name: 'a refused edit puts the text back',
    setup: field({ 'default-value': 'Ada' }),
  },
  {
    family: 'input',
    intents: [{ kind: 'press', part: 'clear' }],
    name: 'the clear button empties the field, sends input, change, and clear, and goes',
    setup: field({ clearable: true, 'default-value': 'Ada' }),
  },
  {
    family: 'input',
    intents: [
      { event: 'before-change', kind: 'refuse' },
      { kind: 'press', part: 'clear' },
    ],
    name: 'a refused clear keeps the text',
    setup: field({ clearable: true, 'default-value': 'Ada' }),
  },
  {
    family: 'input',
    intents: [
      { kind: 'set', prop: 'value', value: 'Grace' },
      { kind: 'type', text: '!' },
    ],
    name: 'a value the page writes sends nothing, and typing goes on from it',
    setup: field({ 'default-value': 'Ada' }),
  },
  {
    family: 'input',
    intents: [
      { kind: 'type', text: 'A' },
      { kind: 'leave' },
      { erase: 1, kind: 'type' },
      { kind: 'leave' },
    ],
    name: 'a required field is marked wrong once a change has given the reader a go',
    setup: field({ required: true }),
  },
  {
    family: 'input',
    intents: [
      { kind: 'type', text: 'ada' },
      { kind: 'leave' },
      { kind: 'type', text: '@example.com' },
    ],
    name: 'an email field is wrong until the text reads as an address',
    setup: field({ type: 'email' }),
  },
  {
    family: 'input',
    intents: [{ kind: 'type', text: '12a' }, { kind: 'leave' }, { erase: 1, kind: 'type' }],
    name: 'text the pattern does not match whole is wrong',
    setup: field({ pattern: '[0-9]+' }),
  },
  {
    family: 'input',
    intents: [{ kind: 'type', text: 'x' }],
    name: 'a disabled field takes neither focus nor an edit',
    setup: field({ clearable: true, 'default-value': 'Ada', disabled: true }),
  },
  {
    family: 'input',
    intents: [{ kind: 'type', text: 'x' }, { kind: 'leave' }],
    name: 'a read-only field takes focus and no edit',
    setup: field({ clearable: true, 'default-value': 'Ada', readonly: true }),
  },
  {
    family: 'input',
    intents: [{ kind: 'type', text: 'x' }],
    name: 'the page’s own message marks the field wrong at once',
    setup: field({ feedback: 'That name is taken.' }),
  },
]
