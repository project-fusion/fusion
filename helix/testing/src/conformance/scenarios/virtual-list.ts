import { el, type Held, type Scenario, type Setup } from '../format.js'

/*
 * The scenarios of Virtual List, whose items arrive as data. Each one names a
 * row by its place in the set. The web presses and focuses the row it drew in
 * the light DOM, and a phone the press around its words, and the comparison
 * holds what each key and press leaves to one record: the keys chosen, and the
 * row with focus. What `range-change` and `load-more` say is read from laid-out
 * lengths, so a jest spec of the phone holds those.
 */

const FRUIT = ['Apple', 'Banana', 'Cherry', 'Date', 'Elderberry', 'Fig']

/** A list of fruit, with its props. */
const list = (
  props: Readonly<Record<string, boolean | number | string>> = {},
  items: readonly unknown[] = FRUIT,
): Setup => ({ ...el('helix-virtual-list', { label: 'Fruit', ...props }), items })

/** A press on the row at `row`. */
const press = (row: number, held?: Held) => ({
  kind: 'press' as const,
  row,
  ...(held ? { held } : {}),
})

/** Focus on the row at `row`. */
const focus = (row: number) => ({ kind: 'focus' as const, row })

/** A key where focus is. */
const key = (name: string, held?: Held) => ({
  key: name,
  kind: 'key' as const,
  ...(held ? { held } : {}),
})

/** Virtual lists: choosing by a press and by the keys, moving between items, typing, and moving an item. */
export const VIRTUAL_LIST: readonly Scenario[] = [
  {
    family: 'virtual-list',
    intents: [press(1), press(3), press(1)],
    name: 'a press adds or takes out an item under multiple',
    setup: list({ 'selection-mode': 'multiple' }),
  },
  {
    family: 'virtual-list',
    intents: [press(1), press(3), press(3)],
    name: 'a press selects one item under single, and a second press lets it go',
    setup: list({ 'selection-mode': 'single' }),
  },
  {
    family: 'virtual-list',
    intents: [press(1), press(3)],
    name: 'a press selects the item alone under replace',
    setup: list({ 'selection-behavior': 'replace', 'selection-mode': 'multiple' }),
  },
  {
    family: 'virtual-list',
    intents: [{ event: 'before-change', kind: 'refuse' }, press(1)],
    name: 'a refused change keeps the items chosen',
    setup: list({ 'selection-mode': 'multiple', value: 'Apple' }),
  },
  {
    family: 'virtual-list',
    intents: [press(1)],
    name: 'a press on a disabled item chooses nothing',
    setup: list({ 'disabled-keys': 'Banana', 'selection-mode': 'multiple' }),
  },
  {
    family: 'virtual-list',
    intents: [press(1)],
    name: 'a press on a list with no selection mode chooses nothing',
    setup: list(),
  },
  {
    family: 'virtual-list',
    intents: [
      focus(0),
      key('ArrowDown'),
      key('ArrowDown'),
      key('ArrowUp'),
      key('End'),
      key('Home'),
    ],
    name: 'the arrows, Home, and End move between the rows',
    setup: list(),
  },
  {
    family: 'virtual-list',
    intents: [focus(0), key('ArrowDown'), key('End'), key('ArrowUp')],
    name: 'the keys pass over a disabled item',
    setup: list({ 'disabled-keys': 'Banana,Fig' }),
  },
  {
    family: 'virtual-list',
    intents: [focus(0), key('c'), key('f'), key('a')],
    name: 'a typed letter moves to the next item it starts',
    setup: list(),
  },
  {
    family: 'virtual-list',
    intents: [
      focus(1),
      key(' '),
      key('ArrowDown', { shift: true }),
      key('ArrowDown', { shift: true }),
      key('Escape'),
      key('a', { toggle: true }),
    ],
    name: 'Space, Shift with an arrow, Escape, and Control with A choose from the keys',
    setup: list({ 'selection-mode': 'multiple' }),
  },
  {
    family: 'virtual-list',
    intents: [focus(0), key('ArrowDown'), key('ArrowDown'), key('ArrowDown', { toggle: true })],
    name: 'the arrows carry the selection under replace, and Control moves without it',
    setup: list({ 'selection-behavior': 'replace', 'selection-mode': 'multiple' }),
  },
  {
    family: 'virtual-list',
    intents: [
      focus(0),
      key('ArrowRight'),
      key('ArrowDown'),
      key('Home'),
      key('End'),
      key('End', { toggle: true }),
    ],
    name: 'a grid moves along a line and down a column, and Home and End keep to the line',
    setup: list({ columns: 2 }),
  },
  {
    family: 'virtual-list',
    intents: [focus(0), key('ArrowRight'), key('ArrowRight'), key('ArrowLeft'), key('ArrowDown')],
    name: 'a list that runs across moves on Left and Right, and leaves Down to the row',
    setup: list({ orientation: 'horizontal' }),
  },
  {
    family: 'virtual-list',
    intents: [press(0), press(2)],
    name: 'a list in sections chooses by the key its field names',
    setup: list(
      {
        'key-field': 'id',
        'section-field': 'kind',
        'selection-mode': 'multiple',
        'text-field': 'name',
      },
      [
        { id: 'a', kind: 'Fruit', name: 'Apple' },
        { id: 'b', kind: 'Fruit', name: 'Banana' },
        { id: 'c', kind: 'Root', name: 'Carrot' },
      ],
    ),
  },
  {
    family: 'virtual-list',
    intents: [focus(1), key('ArrowDown', { alt: true })],
    name: 'Alt with an arrow moves an item under reorderable',
    setup: list({ reorderable: true }),
  },
  {
    family: 'virtual-list',
    intents: [{ event: 'before-reorder', kind: 'refuse' }, focus(1), key('ArrowUp', { alt: true })],
    name: 'a refused move sends no reorder',
    setup: list({ reorderable: true }),
  },
]
