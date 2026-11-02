import { el, type Scenario } from '../format.js'

/*
 * The scenarios of Textarea, which a reader types several lines into, as
 * Input's: the events each edit sends, the text the field holds, and whether
 * the element is marked wrong. Length bounds are left to the native specs,
 * as Input's are.
 */

/** A textarea labeled Notes, with its props. */
const notes = (props: Readonly<Record<string, boolean | number | string>> = {}) =>
  el('helix-textarea', { label: 'Notes', ...props })

/** Textareas: typing, refusing, clearing, a written value, and validation. */
export const TEXTAREA: readonly Scenario[] = [
  {
    family: 'textarea',
    intents: [{ kind: 'type', text: 'Hi' }, { kind: 'leave' }],
    name: 'each character asks, then sends input, and leaving sends change',
    setup: notes(),
  },
  {
    family: 'textarea',
    intents: [
      { event: 'before-change', kind: 'refuse' },
      { kind: 'type', text: 'x' },
    ],
    name: 'a refused edit puts the text back',
    setup: notes({ 'default-value': 'Draft' }),
  },
  {
    family: 'textarea',
    intents: [{ kind: 'press', part: 'clear' }],
    name: 'the clear button empties the field, sends input, change, and clear, and goes',
    setup: notes({ clearable: true, 'default-value': 'Draft' }),
  },
  {
    family: 'textarea',
    intents: [
      { kind: 'set', prop: 'value', value: 'Saved' },
      { kind: 'type', text: '!' },
    ],
    name: 'a value the page writes sends nothing, and typing goes on from it',
    setup: notes({ 'default-value': 'Draft' }),
  },
  {
    family: 'textarea',
    intents: [{ kind: 'type', text: 'A' }, { kind: 'leave' }, { erase: 1, kind: 'type' }],
    name: 'a required field is marked wrong once a change has given the reader a go',
    setup: notes({ required: true }),
  },
  {
    family: 'textarea',
    intents: [{ kind: 'type', text: 'x' }, { kind: 'leave' }],
    name: 'a read-only field takes focus and no edit',
    setup: notes({ 'default-value': 'Draft', readonly: true }),
  },
  {
    family: 'textarea',
    intents: [{ kind: 'type', text: 'x' }],
    name: 'a disabled field takes neither focus nor an edit',
    setup: notes({ disabled: true }),
  },
]
