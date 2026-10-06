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

  test('leaves out a series a legend hid', () => {
    expect(spokenReading(ROW, undefined, (cell) => cell !== 0)).toBe('March: Status Outage')
  })

  test('says where it stands after it, where the chart gives a position', () => {
    expect(spokenReading(ROW, 0, undefined, '2 of 12')).toBe('March, Revenue $128k (2 of 12)')
    expect(spokenReading({ cells: [], label: 'Q1' }, undefined, undefined, '1 of 4')).toBe(
      'Q1 (1 of 4)',
    )
  })

  /* Heatmap wrapped the chart's pointer to say "selected" inside the
     position, since nothing else could carry a state word. */
  test('says a state word after the position, in the same brackets', () => {
    expect(spokenReading(ROW, 0, undefined, '2 of 12', 'selected')).toBe(
      'March, Revenue $128k (2 of 12, selected)',
    )
    expect(spokenReading({ cells: [], label: 'Q1' }, undefined, undefined, '', 'selected')).toBe(
      'Q1 (selected)',
    )
  })

  test('leaves out a heading the table does not have', () => {
    expect(spokenReading({ cells: [{ name: '', text: '7' }], label: 'Mon' })).toBe('Mon: 7')
  })
})
