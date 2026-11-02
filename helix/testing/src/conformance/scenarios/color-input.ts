import { el, type Scenario } from '../format.js'

/*
 * The scenarios of Color Input, a text field that opens a color picker. Both
 * halves type into it, open and close its picker, and refuse a change, and the
 * comparison holds the two records to each other: the events each sends, the
 * text it holds, and whether its picker stands open.
 */

/** A field named Brand, with its props. */
const brand = (props: Readonly<Record<string, boolean | number | string>> = {}) =>
  el('helix-color-input', { label: 'Brand', 'trigger-label': 'Choose a color', ...props })

/** Color inputs: typing, the picker, a refusal, and a field that does not move. */
export const COLOR_INPUT: readonly Scenario[] = [
  {
    family: 'color-input',
    intents: [{ kind: 'type', text: '#ff0000' }, { kind: 'leave' }],
    name: 'typed text in any syntax is the value',
    setup: brand(),
  },
  {
    family: 'color-input',
    intents: [{ kind: 'type', text: 'nope' }, { kind: 'leave' }],
    name: 'typed text that is no color is reported once the reader leaves',
    setup: brand(),
  },
  {
    family: 'color-input',
    intents: [
      { event: 'before-change', kind: 'refuse' },
      { kind: 'type', text: '#ff0000' },
    ],
    name: 'a refused edit leaves the text',
    setup: brand({ value: '#336699' }),
  },
  {
    family: 'color-input',
    intents: [{ kind: 'open' }, { kind: 'close' }],
    name: 'the trigger opens and closes the picker',
    setup: brand({ value: '#336699' }),
  },
  {
    family: 'color-input',
    intents: [{ kind: 'open' }, { by: 'escape', kind: 'dismiss' }],
    name: 'a close request closes the picker',
    setup: brand({ value: '#336699' }),
  },
  {
    family: 'color-input',
    intents: [{ event: 'before-open', kind: 'refuse' }, { kind: 'open' }],
    name: 'a refused open leaves the picker closed',
    setup: brand({ value: '#336699' }),
  },
  {
    family: 'color-input',
    intents: [{ kind: 'open' }],
    name: 'a read-only field does not open its picker',
    setup: brand({ readonly: true, value: '#336699' }),
  },
  {
    family: 'color-input',
    intents: [{ kind: 'open' }],
    name: 'a disabled field does not open its picker',
    setup: brand({ disabled: true, value: '#336699' }),
  },
  {
    family: 'color-input',
    intents: [{ erase: 7, kind: 'type' }, { kind: 'leave' }],
    name: 'a required field emptied is marked',
    setup: brand({ required: true, value: '#336699' }),
  },
]
