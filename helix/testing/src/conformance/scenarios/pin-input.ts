import { el, type Scenario } from '../format.js'

/*
 * The scenarios of Pin Input, whose one field holds a short code drawn as a
 * box a character. Both halves type each character as its own edit, and the
 * comparison holds the two records to each other: the events each edit
 * sends, the code the field holds, and whether the element is marked wrong.
 */

/** A four-box code labeled Code, with its props. */
const code = (props: Readonly<Record<string, boolean | number | string>> = {}) =>
  el('helix-pin-input', { label: 'Code', length: 4, ...props })

/** Pin Inputs: typing, filling, cleaning, refusing, a short code, and a field that takes no edit. */
export const PIN_INPUT: readonly Scenario[] = [
  {
    family: 'pin-input',
    intents: [
      { kind: 'type', text: '1234' },
      { at: 1, kind: 'box' },
      { kind: 'type', selection: true, text: '9' },
      { kind: 'type', selection: true, text: '8' },
    ],
    name: 'a press on a box puts the caret there, and typing replaces its character and moves on',
    setup: code(),
  },
  {
    family: 'pin-input',
    intents: [
      { kind: 'type', text: '123' },
      { at: 0, kind: 'box' },
      { erase: 1, kind: 'type', selection: true },
      { kind: 'type', selection: true, text: '7' },
    ],
    name: 'erasing on a filled box removes its character, and the next one types there',
    setup: code(),
  },
  {
    family: 'pin-input',
    intents: [
      { kind: 'type', text: '1' },
      { at: 3, kind: 'box' },
      { kind: 'type', selection: true, text: '2' },
    ],
    name: 'a press on a box past the code puts the caret after the code',
    setup: code(),
  },
  {
    family: 'pin-input',
    intents: [
      { kind: 'type', text: '12' },
      { kind: 'type', text: '34' },
    ],
    name: 'each character asks, and filling the last box sends complete and change',
    setup: code(),
  },
  {
    family: 'pin-input',
    intents: [{ kind: 'type', text: '1a2' }],
    name: 'a character the type refuses is dropped',
    setup: code(),
  },
  {
    family: 'pin-input',
    intents: [{ kind: 'type', text: 'ab' }],
    name: 'letters are cased as case asks',
    setup: code({ case: 'upper', type: 'alphanumeric' }),
  },
  {
    family: 'pin-input',
    intents: [
      { event: 'before-change', kind: 'refuse' },
      { kind: 'type', text: '1' },
    ],
    name: 'a refused edit leaves the code as it was',
    setup: code(),
  },
  {
    family: 'pin-input',
    intents: [{ kind: 'type', text: '12' }, { kind: 'leave' }],
    name: 'a code shorter than its boxes is wrong once the reader leaves it',
    setup: code(),
  },
  {
    family: 'pin-input',
    intents: [{ kind: 'type', text: '1' }],
    name: 'a disabled code takes neither focus nor an edit',
    setup: code({ disabled: true }),
  },
]
