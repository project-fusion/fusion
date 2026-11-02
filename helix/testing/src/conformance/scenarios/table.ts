import { el, type Held, type PropValue, type Scenario } from '../format.js'

/*
 * The scenarios of Table, whose rows hold their cells. An item is a row by its
 * value, or a column by its field. The record says what a screen reader hears of
 * each cell, with its column's heading, what is selected and sorted, which rows
 * are open, and where a grid's one stop stands.
 */

type Props = Readonly<Record<string, PropValue>>

const column = (words: string, props: Props = {}) =>
  el('helix-table-column', { value: words.toLowerCase(), ...props }, [words])

const row = (value: string, cells: readonly string[], props: Props = {}) =>
  el('helix-table-row', { value, ...props }, [
    ...cells.map((words, at) => el('helix-table-cell', at === 0 ? { header: true } : {}, [words])),
  ])

/** Three services, each with a name and a count, in an order no sort would leave. */
const table = (props: Props = {}, rowProps: Readonly<Record<string, Props>> = {}) =>
  el('helix-table', { label: 'Services', ...props }, [
    column('Service', { field: 'service', sortable: true }),
    column('Count', { field: 'count', sortable: true, 'text-align': 'end' }),
    row('web', ['web-app', '980'], rowProps.web),
    row('api', ['billing-api', '1,204'], rowProps.api),
    row('search', ['search', '-3'], rowProps.search),
  ])

/** A folder of two files, and a third file beside it. */
const nested = (props: Props = {}) =>
  el('helix-table', { label: 'Files', ...props }, [
    column('Name'),
    row('docs', ['Documents']),
    row('budget', ['Budget'], { parent: 'docs' }),
    row('notes', ['Notes'], { parent: 'docs' }),
    row('invoice', ['Invoice']),
  ])

const press = (item: string, part?: string) => ({
  item,
  kind: 'press' as const,
  ...(part === undefined ? {} : { part }),
})
const all = { kind: 'press' as const, part: 'checkbox' }
const stop = { kind: 'focus' as const }
const key = (name: string, held?: Held) => ({
  key: name,
  kind: 'key' as const,
  ...(held ? { held } : {}),
})
const refuse = (event: string) => ({ event, kind: 'refuse' as const })

/** Tables: sorting, selecting, nesting, moving rows, and a grid's keys. */
export const TABLE: readonly Scenario[] = [
  {
    family: 'table',
    intents: [{ kind: 'set', prop: 'label', value: 'Still services' }],
    name: 'each cell says its column and its words',
    setup: table(),
  },
  {
    family: 'table',
    intents: [press('count', 'sort'), press('count', 'sort'), press('count', 'sort')],
    name: 'a press on a sortable heading cycles the order, numbers by their value',
    setup: table(),
  },
  {
    family: 'table',
    intents: [refuse('before-sort'), press('service', 'sort')],
    name: 'a refused sort keeps the order',
    setup: table({ 'default-sort': 'count:desc' }),
  },
  {
    family: 'table',
    intents: [press('web', 'checkbox'), press('search', 'checkbox'), press('web', 'checkbox')],
    name: 'a row checkbox adds and takes out its row, in row order',
    setup: table({ selectable: true }),
  },
  {
    family: 'table',
    intents: [all, all],
    name: 'the heading checkbox selects every row a reader can, then none',
    setup: table({ selectable: true }, { api: { disabled: true } }),
  },
  {
    family: 'table',
    intents: [refuse('before-select'), press('web', 'checkbox')],
    name: 'a refused selection keeps it',
    setup: table({ 'default-selected': 'api', selectable: true }),
  },
  {
    family: 'table',
    intents: [press('web', 'checkbox'), press('api', 'checkbox')],
    name: 'one at a time lets go of the row before',
    setup: table({ selectable: true, 'selection-mode': 'single' }),
  },
  {
    family: 'table',
    intents: [press('web'), press('search')],
    name: 'under replace a press on a row selects it alone',
    setup: table({ selectable: true, 'selection-behavior': 'replace' }),
  },
  {
    family: 'table',
    intents: [press('docs', 'expand-button'), press('docs', 'expand-button')],
    name: 'a disclosure button shows and hides the rows under a row',
    setup: nested(),
  },
  {
    family: 'table',
    intents: [refuse('before-expand'), press('docs', 'expand-button')],
    name: 'a refused expand keeps the row shut',
    setup: nested(),
  },
  {
    family: 'table',
    intents: [{ by: 1, item: 'web', kind: 'move' }],
    name: 'a screen reader moves a row by its grip',
    setup: table({ reorderable: true }),
  },
  {
    family: 'table',
    intents: [refuse('before-reorder'), { by: 1, item: 'web', kind: 'move' }],
    name: 'a refused move says so',
    setup: table({ reorderable: true }),
  },
  {
    family: 'table',
    intents: [stop, key('ArrowDown'), key('ArrowRight'), key('Home'), key('End'), key('ArrowUp')],
    name: 'the arrows, Home and End move a grid stop, the headings included',
    setup: table({ grid: true }),
  },
  {
    family: 'table',
    intents: [stop, key('End', { toggle: true }), key('Home', { toggle: true })],
    name: 'Control with Home or End goes to the corners',
    setup: table({ grid: true }),
  },
  {
    family: 'table',
    intents: [stop, key('ArrowDown'), key('s'), key('b')],
    name: 'a typed letter goes to the next row it starts',
    setup: table({ grid: true }),
  },
  {
    family: 'table',
    intents: [stop, key('ArrowRight'), key('Enter')],
    name: 'Enter on a sortable heading sorts',
    setup: table({ grid: true }),
  },
  {
    family: 'table',
    intents: [stop, key('ArrowDown'), key(' '), key('ArrowDown', { shift: true })],
    name: 'Space selects a row, and Shift with Down takes the rows it crosses',
    setup: table({ grid: true, selectable: true }),
  },
  {
    family: 'table',
    intents: [stop, key('ArrowDown'), key('a', { toggle: true })],
    name: 'Control or Command with A selects every row',
    setup: table({ grid: true, selectable: true }),
  },
  {
    family: 'table',
    intents: [stop, key('ArrowDown'), key('ArrowRight'), key('ArrowDown'), key('ArrowLeft')],
    name: 'Right opens a shut row on its disclosure cell, and Left moves to its parent',
    setup: nested({ grid: true }),
  },
]
