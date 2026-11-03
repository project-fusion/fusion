import { el, type Scenario, type Setup } from '../format.js'

/*
 * The scenarios of Combobox, a text field that filters a list of options. A record
 * says what typing sends, which options a filter leaves, and what a choice sends.
 */

/** Four kinds of fruit, the third disabled. */
const combobox = (props: Setup['props'] = {}): Setup =>
  el('helix-combobox', { label: 'Fruit', ...props }, [
    el('helix-option', { value: 'apple' }, ['Apple']),
    el('helix-option', { value: 'banana' }, ['Banana']),
    el('helix-option', { disabled: true, value: 'cherry' }, ['Cherry']),
    el('helix-option', { value: 'date' }, ['Date']),
  ])

/** Combobox: narrowing, choosing, refusing, many chosen, ways out, and what the page writes. */
export const COMBOBOX: readonly Scenario[] = [
  {
    family: 'combobox',
    intents: [{ kind: 'type', text: 'an' }],
    name: 'typing opens the list and narrows it, and sends no change',
    setup: combobox(),
  },
  {
    family: 'combobox',
    intents: [
      { kind: 'type', text: 'b' },
      { item: 'banana', kind: 'press' },
    ],
    name: 'a press chooses the option and closes the list',
    setup: combobox(),
  },
  {
    family: 'combobox',
    intents: [
      { event: 'before-change', kind: 'refuse' },
      { kind: 'type', text: 'b' },
      { item: 'banana', kind: 'press' },
    ],
    name: 'a refused choice leaves the value and the list open',
    setup: combobox(),
  },
  {
    family: 'combobox',
    intents: [
      { event: 'before-filter', kind: 'refuse' },
      { kind: 'type', text: 'zz' },
    ],
    name: 'a refused filter leaves the list whole',
    setup: combobox(),
  },
  {
    family: 'combobox',
    intents: [
      { kind: 'type', text: 'a' },
      { item: 'apple', kind: 'press' },
      { item: 'date', kind: 'press' },
    ],
    name: 'under multiple a press adds and the list stays open',
    setup: combobox({ multiple: true }),
  },
  {
    family: 'combobox',
    intents: [
      { kind: 'type', text: 'a' },
      { by: 'escape', kind: 'dismiss' },
    ],
    name: 'a close request closes it',
    setup: combobox(),
  },
  {
    family: 'combobox',
    intents: [{ kind: 'set', prop: 'value', value: 'date' }],
    name: 'a value the page writes moves it and says nothing',
    setup: combobox(),
  },
]
