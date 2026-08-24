import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@helix-io/testing/dom'

let readRows: (table: Element) => Array<{
  label: string
  when?: string
  cells: Array<{ name: string; text: string; value?: number }>
}>
let readSeries: (table: Element) => Array<{ name: string; points: unknown[] }>

beforeAll(async () => {
  registerDom()
  ;({ readRows, readSeries } = await import('./read-series.js'))
})

/** A table with a formatted figure and a column no chart would plot. */
const TABLE = `<table>
  <caption>Sessions by channel</caption>
  <thead><tr><th>Month</th><th>Direct</th><th>Referral</th><th>Note</th></tr></thead>
  <tbody>
    <tr><th><time datetime="2026-01">Jan</time></th><td data-value="1180">1,180</td><td data-value="940">940</td><td>Launch</td></tr>
    <tr><th>Feb</th><td data-value="1240">1,240</td><td data-value="1010">1,010</td><td>&mdash;</td></tr>
  </tbody>
</table>`

const table = (): Element => {
  document.body.innerHTML = TABLE
  return document.body.firstElementChild as Element
}

describe('readRows', () => {
  test('keeps the cell text, which is what the table decided a number reads as', () => {
    /* The whole reason this exists beside `readSeries`. That one keeps `1180`,
       because that is what a chart measures; a tooltip printing it would be the
       chart overruling the table about how its own figure reads. */
    expect(readRows(table())[0]?.cells[0]).toEqual({ name: 'Direct', text: '1,180', value: 1180 })
  })

  test('keeps a column nothing was plotted from', () => {
    const cells = readRows(table())[0]?.cells ?? []
    expect(cells).toHaveLength(3)
    expect(cells[2]).toEqual({ name: 'Note', text: 'Launch' })
  })

  test('and that column is the one `readSeries` drops, which is the point', () => {
    expect(readSeries(table())).toHaveLength(2)
    expect(readRows(table())[0]?.cells).toHaveLength(3)
  })

  test('a non-numeric cell carries no value rather than a NaN', () => {
    /* What the tooltip keys its series color off. A `NaN` here would read as
       "a number I could not parse" and take a palette color with it. */
    expect(readRows(table())[0]?.cells[2]?.value).toBeUndefined()
  })

  test('heads each row with its own label', () => {
    expect(readRows(table()).map((row) => row.label)).toEqual(['Jan', 'Feb'])
  })

  test('carries the machine-readable instant where the header has one', () => {
    const rows = readRows(table())
    expect(rows[0]?.when).toBe('2026-01')
    expect(rows[1]?.when).toBeUndefined()
  })

  test('reads a grid as well as a table, the way `readSeries` does', () => {
    document.body.innerHTML = `<div role="grid">
      <div role="row"><span role="columnheader">Month</span><span role="columnheader">Direct</span></div>
      <div role="row"><span role="rowheader">Jan</span><span role="gridcell" data-value="10">10</span></div>
    </div>`
    const rows = readRows(document.body.firstElementChild as Element)
    expect(rows.at(-1)?.cells[0]).toEqual({ name: 'Direct', text: '10', value: 10 })
  })
})
