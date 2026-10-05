import { describe, expect, test } from 'bun:test'
import type { Row } from '../read-series/read-series.js'
import { spokenReading } from './spoken-reading.js'

/* What a chart's readout says for a reading the keys moved to. The table's own
   words, so it agrees with the bubble and needs no translation. */
const ROW: Row = {
  cells: [
    { name: 'Revenue', text: '$128k', value: 128_000 },
    { name: 'Note', text: '' },
    { name: 'Status', text: 'Outage' },
  ],
  label: 'March',
}

describe('a reading in words', () => {
  test('is the row and every cell that says something', () => {
    expect(spokenReading(ROW)).toBe('March: Revenue $128k, Status Outage')
  })

  test('or the one cell the series keys rest on', () => {
    expect(spokenReading(ROW, 0)).toBe('March, Revenue $128k')
  })

  test('falls back to the whole row for a cell that is not there', () => {
    expect(spokenReading(ROW, 9)).toBe('March: Revenue $128k, Status Outage')
  })

  test('is the row name alone where nothing in it is written', () => {
    expect(spokenReading({ cells: [{ name: 'A', text: ' ' }], label: 'Q1' })).toBe('Q1')
  })

  test('leaves out a heading the table does not have', () => {
    expect(spokenReading({ cells: [{ name: '', text: '7' }], label: 'Mon' })).toBe('Mon: 7')
  })
})
