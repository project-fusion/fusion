import { describe, expect, test } from 'bun:test'
import type { LogGroup, LogLine } from './buffer.js'
import { logRows, markMatches } from './rows.js'

const groups: LogGroup[] = [
  { heading: 'Install', id: 'install', status: 'done' },
  { heading: 'Test', id: 'test', status: 'running' },
]

const lines: LogLine[] = [
  { text: 'Run started' },
  { group: 'install', text: 'added 214 packages' },
  { group: 'install', text: 'audited 215 packages' },
  { group: 'test', text: 'PASS core' },
  { group: 'test', text: 'FAIL styled' },
]

/** The rows as short strings, to compare whole. */
const shape = (input: Partial<Parameters<typeof logRows>[0]>): string[] =>
  logRows({ groups, lines, open: () => true, query: '', start: 0, ...input }).rows.map((row) =>
    row.kind === 'group'
      ? `[${row.group.id}${row.open ? '' : ' shut'}]`
      : `${row.number} ${row.line.text}`,
  )

describe('logRows', () => {
  test('puts each group heading before its first line', () => {
    expect(shape({})).toEqual([
      '1 Run started',
      '[install]',
      '2 added 214 packages',
      '3 audited 215 packages',
      '[test]',
      '4 PASS core',
      '5 FAIL styled',
    ])
  })

  test('folds a shut group to its heading', () => {
    expect(shape({ open: (id) => id !== 'install' })).toEqual([
      '1 Run started',
      '[install shut]',
      '[test]',
      '4 PASS core',
      '5 FAIL styled',
    ])
  })

  test('numbers lines from the first ever written, past lines let go', () => {
    expect(shape({ lines: lines.slice(3), start: 3 })).toEqual([
      '[test]',
      '4 PASS core',
      '5 FAIL styled',
    ])
  })

  test('stands a group with no line yet after the rest', () => {
    const more = [...groups, { heading: 'Deploy', id: 'deploy', status: 'pending' as const }]
    expect(shape({ groups: more }).at(-1)).toBe('[deploy]')
  })

  test('shows the line still being written last, numbered after the rest', () => {
    expect(shape({ current: { group: 'test', text: 'RUNS spec' } }).at(-1)).toBe('6 RUNS spec')
  })

  test('shows only matches while searching, opening the groups that hold one', () => {
    const result = logRows({ groups, lines, open: () => false, query: 'PACKAGES', start: 0 })
    expect(result.matched).toBe(2)
    expect(shape({ open: () => false, query: 'packages' })).toEqual([
      '[install]',
      '2 added 214 packages',
      '3 audited 215 packages',
    ])
  })

  test('counts every line where there is no search', () => {
    expect(logRows({ groups, lines, open: () => true, query: ' ', start: 0 }).matched).toBe(5)
  })
})

describe('markMatches', () => {
  test('splits runs at each match, keeping each run’s style', () => {
    const pieces = markMatches(
      [{ text: 'no ' }, { color: 'red', text: 'error here, Error' }],
      'error',
    )
    expect(pieces).toEqual([
      { text: 'no ' },
      { color: 'red', match: true, text: 'error' },
      { color: 'red', text: ' here, ' },
      { color: 'red', match: true, text: 'Error' },
    ])
  })

  test('marks a match that crosses two runs in both', () => {
    const pieces = markMatches([{ text: 'fa' }, { bold: true, text: 'iled' }], 'failed')
    expect(pieces).toEqual([
      { match: true, text: 'fa' },
      { bold: true, match: true, text: 'iled' },
    ])
  })

  test('leaves the runs alone where nothing matches', () => {
    expect(markMatches([{ text: 'ok' }], 'nope')).toEqual([{ text: 'ok' }])
  })
})

describe('a level', () => {
  test('narrows as a search does, a step showing while it holds a line that shows', () => {
    const lines: LogLine[] = [
      { level: 'log', text: 'starting' },
      { group: 'install', level: 'debug', text: 'resolved' },
      { group: 'test', level: 'warn', text: 'slow chunk' },
    ]
    const { matched, rows } = logRows({
      groups,
      level: 'info',
      lines,
      open: () => false,
      query: '',
      start: 0,
    })
    expect(matched).toBe(1)
    expect(rows.map((row) => (row.kind === 'group' ? `[${row.group.id}]` : row.line.text))).toEqual(
      ['[test]', 'slow chunk'],
    )
  })
})
