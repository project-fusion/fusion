import { describe, expect, test } from 'bun:test'
import { exportText, guardFormula } from './export.js'

const data = {
  fields: ['name', 'amount'],
  headings: ['Name', 'Amount'],
  rows: [
    ['Acme, Inc.', -40],
    ['=SUM(A1)', 12],
    ['two\tparts\nhere', null],
  ],
}

describe('an export', () => {
  test('as CSV quotes commas and guards formulas, and leaves numbers alone', () => {
    expect(exportText(data, 'csv')).toBe(
      'Name,Amount\r\n"Acme, Inc.",-40\r\n\'=SUM(A1),12\r\n"two\tparts\nhere",',
    )
  })

  test('as TSV turns tabs and line breaks into spaces', () => {
    expect(exportText(data, 'tsv').split('\r\n')[3]).toBe('two parts here\t')
  })

  test('as JSON keys each row by field', () => {
    expect(JSON.parse(exportText(data, 'json'))[0]).toEqual({ amount: -40, name: 'Acme, Inc.' })
  })
})

test('a date is written as its ISO text', () => {
  expect(guardFormula(new Date('2026-11-06T00:00:00Z'))).toBe('2026-11-06T00:00:00.000Z')
})
