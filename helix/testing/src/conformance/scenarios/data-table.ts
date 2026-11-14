import { el, type Scenario } from '../format.js'

/** Three services and a fourth, in an order no sort would leave. */
const SERVICES = [
  { count: 980, id: 'web', service: 'web-app' },
  { count: 1204, id: 'api', service: 'billing-api' },
  { count: -3, id: 'search', service: 'search' },
  { count: 7, id: 'mail', service: 'mail' },
]

type Props = Readonly<Record<string, boolean | number | string>>

const column = (words: string, field: string, props: Props = {}) =>
  el('helix-table-column', { field, value: field, ...props }, [words])

/** A table of the services. */
const table = (props: Props = {}) => ({
  ...el('helix-data-table', { label: 'Services', 'row-key': 'id', ...props }, [
    column('Service', 'service', { sortable: true }),
    column('Count', 'count', { sortable: true, 'text-align': 'end' }),
  ]),
  items: SERVICES,
})

const refuse = (event: string) => ({ event, kind: 'refuse' as const })
const heading = (item: string) => ({ item, kind: 'press' as const, part: 'sort' })
const all = { kind: 'press' as const, part: 'checkbox' }
const set = (prop: string, value: number | string) => ({ kind: 'set' as const, prop, value })

/** A table drawn from an array: what a reader searches, sorts, pages, and selects. */
export const DATA_TABLE: readonly Scenario[] = [
  {
    family: 'data-table',
    intents: [set('label', 'Still services')],
    name: 'each cell says its column and its value',
    setup: table(),
  },
  {
    family: 'data-table',
    intents: [heading('count'), heading('count'), heading('count')],
    name: 'a press on a sortable heading cycles the order, numbers by their value',
    setup: table(),
  },
  {
    family: 'data-table',
    intents: [refuse('before-sort'), heading('service')],
    name: 'a refused sort keeps the order',
    setup: table({ 'default-sort': 'count:desc' }),
  },
  {
    family: 'data-table',
    intents: [set('filter', 'search'), set('filter', 'nothing like it'), set('filter', '')],
    name: 'a search leaves the rows a column finds, and clearing it brings them back',
    setup: table({ 'empty-text': 'None' }),
  },
  {
    family: 'data-table',
    intents: [set('page', 2), set('page', 1)],
    name: 'a page holds its size of rows',
    setup: table({ 'page-size': 3 }),
  },
  {
    family: 'data-table',
    intents: [all, all],
    name: 'the heading checkbox selects every row of the result past the page, then none',
    setup: table({ 'page-size': 2, selectable: true }),
  },
  {
    family: 'data-table',
    intents: [refuse('before-select'), all],
    name: 'a refused selection keeps it',
    setup: table({ 'default-selected': 'api', selectable: true }),
  },
]
