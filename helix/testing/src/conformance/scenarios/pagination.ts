import { el, type Scenario } from '../format.js'

/** A row of twelve pages. */
const row = (props: Readonly<Record<string, boolean | number | string>> = {}) =>
  el('helix-pagination', { pages: 12, ...props })

const press = (part: string) => ({ kind: 'press' as const, part })
const refuse = (event: string) => ({ event, kind: 'refuse' as const })

/** A row of pages: moving through it, and what refuses a move. */
export const PAGINATION: readonly Scenario[] = [
  {
    family: 'pagination',
    intents: [press('next'), press('next'), press('previous')],
    name: 'next and previous ask to move, and the move stands',
    setup: row({ 'default-page': 4 }),
  },
  {
    family: 'pagination',
    intents: [refuse('before-navigate'), press('next')],
    name: 'a refused move stays on the page',
    setup: row({ 'default-page': 4 }),
  },
  {
    family: 'pagination',
    intents: [press('previous')],
    name: 'previous does nothing on the first page',
    setup: row(),
  },
  {
    family: 'pagination',
    intents: [press('next')],
    name: 'next does nothing on the last page',
    setup: row({ 'default-page': 12 }),
  },
  {
    family: 'pagination',
    intents: [press('last'), press('first')],
    name: 'the end controls reach the ends',
    setup: row({ 'default-page': 5, ends: true }),
  },
  {
    family: 'pagination',
    intents: [press('next')],
    name: 'a compact row moves the same way',
    setup: row({ compact: true, 'default-page': 2 }),
  },
  {
    family: 'pagination',
    intents: [press('next')],
    name: 'the total over the size says how many pages there are',
    setup: el('helix-pagination', { 'default-page': 1, 'page-size': 25, total: 48 }),
  },
  {
    family: 'pagination',
    intents: [press('next')],
    name: 'one page draws nothing to move between',
    setup: el('helix-pagination', { pages: 1 }),
  },
]
