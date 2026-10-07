import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'

/* A table whose served first page and drawn first page disagreed swapped its
   rows under the reader and said nothing. */

let auditServed: typeof import('./audit-served.js').auditServed

beforeAll(async () => {
  registerDom()
  ;({ auditServed } = await import('./audit-served.js'))
})

const warn = console.warn
afterEach(() => {
  console.warn = warn
})

/** A served row, as the page writes it. */
const served = (...cells: string[]): Element => {
  const row = document.createElement('helix-table-row')
  for (const text of cells) {
    const cell = document.createElement('helix-table-cell')
    cell.textContent = text
    row.append(cell)
  }
  return row
}

/** A drawn row, as the table draws it, the checkbox cell included. */
const drawn = (...cells: string[]): Element => {
  const row = document.createElement('div')
  row.innerHTML = `<span part="select"><input type="checkbox"></span>${cells
    .map((text) => `<span part="cell">  ${text}\n</span>`)
    .join('')}`
  return row
}

const table = (): HTMLElement => {
  const host = document.createElement('helix-data-table')
  host.setAttribute('label', 'Files')
  return host
}

const heard = (): string[] => {
  const warnings: string[] = []
  console.warn = (message: string) => warnings.push(message)
  return warnings
}

describe('the served-rows check', () => {
  test('says nothing when the drawn page shows the words the page served', () => {
    const warnings = heard()
    auditServed(
      table(),
      [served('alpha', '30 B'), served('bravo', '4 B')],
      [drawn('alpha', '30 B'), drawn('bravo', '4 B')],
      2,
    )
    expect(warnings).toEqual([])
  })

  test('names the first row that differs, once per table', () => {
    const warnings = heard()
    const host = table()
    const rows = [served('alpha', '30'), served('bravo', '4')]
    auditServed(host, rows, [drawn('bravo', '4 B'), drawn('alpha', '30 B')], 2)
    auditServed(host, rows, [drawn('bravo', '4 B'), drawn('alpha', '30 B')], 2)
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain('<helix-data-table label="Files"> serves row 1 as "alpha | 30"')
    expect(warnings[0]).toContain('draws it as "bravo | 4 B"')
  })

  test('says so when the page serves more rows than the first page holds', () => {
    const warnings = heard()
    auditServed(table(), [served('a'), served('b'), served('c')], [drawn('a'), drawn('b')], 2)
    expect(warnings[0]).toContain('serves 3 rows and its first page holds 2')
  })

  test('says nothing for a table that served no rows', () => {
    const warnings = heard()
    auditServed(table(), [], [drawn('alpha')], 1)
    expect(warnings).toEqual([])
  })
})
