import { describe, expect, test } from 'bun:test'
import {
  adjacencyOf,
  cursorAfter,
  entriesOf,
  groupsOf,
  nameOf,
  sortedOf,
  within,
  withoutGroups,
} from './graph-model.js'

const nodes = [
  { id: 'a', label: 'Alpha' },
  { id: 'b', label: 'Bravo' },
  { id: 'c', label: 'Charlie' },
  { id: 'd', label: 'Delta' },
  { id: 'e' },
]
const links = [
  { source: 'a', target: 'b' },
  { source: 'c', target: 'a' },
  { source: 'a', target: 'd' },
  { source: 'd', target: 'a' },
  { source: 'd', target: 'e' },
  { source: 'b', target: 'b' },
]

describe('adjacencyOf', () => {
  test('records each link at both of its ends', () => {
    const adjacency = adjacencyOf(links)
    expect([...(adjacency.get('a')?.to ?? [])].sort()).toEqual(['b', 'd'])
    expect([...(adjacency.get('a')?.from ?? [])].sort()).toEqual(['c', 'd'])
  })

  test('leaves out a note linking to itself', () => {
    expect(adjacencyOf(links).get('b')?.to.has('b')).toBe(false)
  })
})

describe('within', () => {
  const adjacency = adjacencyOf(links)

  test('is the note alone at depth 0', () => {
    expect([...within(adjacency, 'a', 0)]).toEqual(['a'])
  })

  test('follows links both ways', () => {
    expect([...within(adjacency, 'a', 1)].sort()).toEqual(['a', 'b', 'c', 'd'])
  })

  test('reaches further with each step', () => {
    expect(within(adjacency, 'a', 2).has('e')).toBe(true)
  })

  test('is the note alone where it has no links', () => {
    expect([...within(adjacency, 'z', 3)]).toEqual(['z'])
  })
})

describe('entriesOf', () => {
  const sorted = sortedOf(nodes)
  const adjacency = adjacencyOf(links)

  test('lists the selected note, then its neighbors, then every other note', () => {
    const entries = entriesOf(sorted, adjacency, 'a', '')
    expect(entries.map((entry) => entry.node.id)).toEqual(['a', 'b', 'c', 'd', 'e'])
    expect(entries.map((entry) => entry.relation)).toEqual([
      'selected',
      'to',
      'from',
      'both',
      undefined,
    ])
  })

  test('puts neighbors ahead of notes that sort before them', () => {
    const entries = entriesOf(sorted, adjacency, 'e', '')
    expect(entries.map((entry) => entry.node.id)).toEqual(['e', 'd', 'a', 'b', 'c'])
  })

  test('keeps the names that hold the query, whatever their case', () => {
    expect(entriesOf(sorted, adjacency, 'a', 'RAV').map((entry) => entry.node.id)).toEqual(['b'])
  })

  test('keeps only the notes shown', () => {
    const shown = new Set(['a', 'c'])
    expect(entriesOf(sorted, adjacency, 'a', '', shown).map((entry) => entry.node.id)).toEqual([
      'a',
      'c',
    ])
  })

  test('lists every note in name order where nothing is selected', () => {
    expect(entriesOf(sorted, adjacency, '', '').map((entry) => entry.relation)).toEqual([
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
    ])
  })
})

describe('sortedOf', () => {
  test('orders numbers by their value', () => {
    const notes = [{ id: 'Note 10' }, { id: 'Note 9' }, { id: 'note 1' }]
    expect(sortedOf(notes, 'en').map(nameOf)).toEqual(['note 1', 'Note 9', 'Note 10'])
  })

  test('leaves the notes it was given in their order', () => {
    const notes = [{ id: 'b' }, { id: 'a' }]
    sortedOf(notes)
    expect(notes.map(nameOf)).toEqual(['b', 'a'])
  })
})

describe('nameOf', () => {
  test('is the label, or the id where there is none', () => {
    expect(nameOf({ id: 'x', label: 'Ex' })).toBe('Ex')
    expect(nameOf({ id: 'x' })).toBe('x')
    expect(nameOf({ id: 'x', label: '' })).toBe('x')
  })
})

describe('groupsOf', () => {
  test('names each group once, in the order sort gives, with the tone its notes share', () => {
    expect(
      groupsOf([
        { group: 'b', id: '1', tone: 'danger' },
        { group: 'a', id: '2' },
        { group: 'b', id: '3', tone: 'danger' },
        { group: 'C', id: '4', tone: 'info' },
        { group: 'C', id: '5' },
        { id: '6' },
        { group: '', id: '7' },
      ]),
    ).toEqual([
      { name: 'C', tone: undefined },
      { name: 'a', tone: undefined },
      { name: 'b', tone: 'danger' },
    ])
  })
})

describe('withoutGroups', () => {
  const grouped = [{ group: 'work', id: 'a' }, { group: 'home', id: 'b' }, { id: 'c' }]

  test('keeps every note outside the hidden groups, and a note in no group always', () => {
    expect([...(withoutGroups(grouped, undefined, ['work']) ?? [])]).toEqual(['b', 'c'])
  })

  test('keeps only what the local graph keeps as well', () => {
    expect([...(withoutGroups(grouped, new Set(['a', 'c']), ['home']) ?? [])]).toEqual(['a', 'c'])
  })

  test('leaves nothing out where no group is hidden', () => {
    expect(withoutGroups(grouped, undefined, [])).toBeUndefined()
  })
})

describe('cursorAfter', () => {
  const rows = (...ids: string[]) => ids.map((id) => ({ node: { id } }))

  test('follows the note the cursor was on to its new row', () => {
    expect(cursorAfter(rows('a', 'n', 'b', 'c'), 'b', 1)).toBe(2)
  })

  test('stays on the row of a note taken away, which the next note now holds', () => {
    expect(cursorAfter(rows('a', 'c', 'd'), 'b', 1)).toBe(1)
  })

  test('goes to the last row where the note taken away was last', () => {
    expect(cursorAfter(rows('a', 'b'), 'c', 2)).toBe(1)
  })

  test('is the first row of an empty list, and where it was on no note', () => {
    expect(cursorAfter([], 'a', 3)).toBe(0)
    expect(cursorAfter(rows('a', 'b'), undefined, 0)).toBe(0)
  })
})
