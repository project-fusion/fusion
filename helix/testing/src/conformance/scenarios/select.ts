import { el, type Scenario, type Setup } from '../format.js'

/*
 * The scenarios of Select, a field that opens a list of options. The page opens
 * it by writing `open`, so a record says what a choice sends and whether the list
 * stands open after it.
 */

/** Four kinds of fruit, the third disabled. */
const select = (props: Setup['props'] = {}): Setup =>
  el('helix-select', { label: 'Fruit', ...props }, [
    el('helix-option', { value: 'apple' }, ['Apple']),
    el('helix-option', { value: 'banana' }, ['Banana']),
    el('helix-option', { disabled: true, value: 'cherry' }, ['Cherry']),
    el('helix-option', { value: 'date' }, ['Date']),
  ])

const open = { kind: 'set', prop: 'open', value: true } as const

/** Selects: choosing, refusing, many chosen, ways out, and what the page writes. */
export const SELECT: readonly Scenario[] = [
  {
    family: 'select',
    intents: [open, { item: 'banana', kind: 'press' }],
    name: 'a press chooses the option and closes the list',
    setup: select(),
  },
  {
    family: 'select',
    intents: [open, { event: 'before-change', kind: 'refuse' }, { item: 'banana', kind: 'press' }],
    name: 'a refused choice leaves the value and the list open',
    setup: select(),
  },
  {
    family: 'select',
    intents: [open, { item: 'cherry', kind: 'press' }],
    name: 'a press on a disabled option chooses nothing',
    setup: select(),
  },
  {
    family: 'select',
    intents: [open, { item: 'banana', kind: 'press' }],
    name: 'the chosen option pressed again closes the list and says nothing',
    setup: select({ defaultValue: 'banana' }),
  },
  {
    family: 'select',
    intents: [open, { item: 'apple', kind: 'press' }, { item: 'date', kind: 'press' }],
    name: 'under multiple a press toggles and the list stays open',
    setup: select({ multiple: true }),
  },
  {
    family: 'select',
    intents: [open, { by: 'escape', kind: 'dismiss' }],
    name: 'a close request closes it',
    setup: select(),
  },
  {
    family: 'select',
    intents: [open, { by: 'outside', kind: 'dismiss' }],
    name: 'a press outside closes it',
    setup: select(),
  },
  {
    family: 'select',
    intents: [open, { event: 'before-close', kind: 'refuse' }, { by: 'escape', kind: 'dismiss' }],
    name: 'a refused close keeps it open',
    setup: select(),
  },
  {
    family: 'select',
    intents: [{ kind: 'set', prop: 'value', value: 'date' }],
    name: 'a value the page writes moves it and says nothing',
    setup: select(),
  },
  {
    family: 'select',
    intents: [{ kind: 'focus' }, { key: 'ArrowDown', kind: 'key' }],
    name: 'Down on the closed trigger opens the list',
    setup: select(),
  },
  {
    family: 'select',
    intents: [{ kind: 'focus' }, { key: 'd', kind: 'key' }],
    name: 'a letter on the closed trigger chooses',
    setup: select(),
  },
  {
    family: 'select',
    intents: [
      { kind: 'focus' },
      { key: 'ArrowRight', kind: 'key' },
      { key: 'ArrowRight', kind: 'key' },
    ],
    name: 'an inline arrow steps the choice past a disabled option',
    setup: select({ defaultValue: 'banana' }),
  },
]
