import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'
import { readSeries } from './read-series.js'

beforeAll(() => {
  registerDom()
})

const table = (markup: string): HTMLTableElement => {
  const host = document.createElement('div')
  host.innerHTML = markup
  return host.querySelector('table') as HTMLTableElement
}

describe('reading a table as series', () => {
  test('one column per series, named by the header row', () => {
    const series = readSeries(
      table(`<table>
        <thead><tr><th>Week</th><th>Direct</th><th>Search</th></tr></thead>
        <tbody>
          <tr><th scope="row">W1</th><td>120</td><td>80</td></tr>
          <tr><th scope="row">W2</th><td>140</td><td>96</td></tr>
        </tbody>
      </table>`),
    )
    expect(series.map((one) => one.name)).toEqual(['Direct', 'Search'])
    expect(series[0]?.points.map((p) => p.value)).toEqual([120, 140])
    expect(series[1]?.points.map((p) => p.value)).toEqual([80, 96])
    expect(series[0]?.points.map((p) => p.label)).toEqual(['W1', 'W2'])
  })

  test('one column takes its name from the caption, since a header row of one is usually absent', () => {
    const series = readSeries(
      table(`<table>
        <caption>Accounts by plan</caption>
        <tbody>
          <tr><th scope="row">Free</th><td>1840</td></tr>
          <tr><th scope="row">Team</th><td>612</td></tr>
        </tbody>
      </table>`),
    )
    expect(series).toHaveLength(1)
    expect(series[0]?.name).toBe('Accounts by plan')
    expect(series[0]?.points.map((p) => p.label)).toEqual(['Free', 'Team'])
  })

  test('data-value wins over the text, because the text is for the reader', () => {
    // `$1.2k` is what a reader should see and is not a number.
    const series = readSeries(
      table(`<table><tbody>
        <tr><th scope="row">Q1</th><td data-value="1200">$1.2k</td></tr>
      </tbody></table>`),
    )
    expect(series[0]?.points[0]?.value).toBe(1200)
  })

  test('a row header carrying a time contributes the machine-readable instant', () => {
    const series = readSeries(
      table(`<table><tbody>
        <tr><th scope="row"><time datetime="2026-08-21">21 Aug</time></th><td>4</td></tr>
      </tbody></table>`),
    )
    expect(series[0]?.points[0]).toEqual({ label: '21 Aug', value: 4, when: '2026-08-21' })
  })

  test('a cell that is nearly a number is dropped rather than rounded off', () => {
    /* `Number()` and not `parseFloat`, which reads `12abc` as 12. A dropped
       point leaves a visible gap in the drawing; a silently truncated one is a
       wrong number nobody can see is wrong. An empty cell goes the same way,
       since `Number('')` is 0 and a blank is not a zero. */
    const series = readSeries(
      table(`<table><tbody>
        <tr><th scope="row">A</th><td>12abc</td></tr>
        <tr><th scope="row">B</th><td></td></tr>
        <tr><th scope="row">C</th><td>7</td></tr>
      </tbody></table>`),
    )
    expect(series[0]?.points).toEqual([{ label: 'C', value: 7 }])
  })

  test('a table with no body and no columns is no series rather than a throw', () => {
    expect(readSeries(table('<table></table>'))).toEqual([])
  })

  test('a ragged row contributes what it has and nothing it does not', () => {
    const series = readSeries(
      table(`<table>
        <thead><tr><th>Week</th><th>Direct</th><th>Search</th></tr></thead>
        <tbody>
          <tr><th scope="row">W1</th><td>120</td><td>80</td></tr>
          <tr><th scope="row">W2</th><td>140</td></tr>
        </tbody>
      </table>`),
    )
    expect(series[0]?.points).toHaveLength(2)
    expect(series[1]?.points.map((p) => p.label)).toEqual(['W1'])
  })
})

describe('a cell that carries its own tone', () => {
  /**
   * **Tone is a per-point fact here and a per-series fact everywhere else**,
   * which is the exception a heatmap needs: a strip of ninety days colored by
   * how each day went would otherwise be ninety series, and that is the whole
   * argument for the family existing rather than being a bar chart with flat
   * values.
   */
  test('`data-tone` reaches the point', () => {
    const series = readSeries(
      table(`<table>
        <caption>Uptime</caption>
        <tbody>
          <tr><th scope="row">Mon</th><td data-value="1" data-tone="success">Up</td></tr>
          <tr><th scope="row">Tue</th><td data-value="0" data-tone="danger">Down</td></tr>
        </tbody>
      </table>`),
    )
    expect(series[0]?.points.map((point) => point.tone)).toEqual(['success', 'danger'])
  })

  test('a cell without one carries no tone at all, rather than an empty string', () => {
    const series = readSeries(
      table(`<table>
        <caption>Uptime</caption>
        <tbody><tr><th scope="row">Mon</th><td data-value="1">Up</td></tr></tbody>
      </table>`),
    )
    expect(series[0]?.points[0]).not.toHaveProperty('tone')
  })

  /**
   * The tone rides along with the value rather than replacing it, so a component
   * that buckets numbers and one that reads tones can look at the same table.
   */
  test('the value survives beside it', () => {
    const series = readSeries(
      table(`<table>
        <caption>Uptime</caption>
        <tbody><tr><th scope="row">Mon</th><td data-value="0.997" data-tone="success">99.7%</td></tr></tbody>
      </table>`),
    )
    expect(series[0]?.points[0]).toMatchObject({ label: 'Mon', tone: 'success', value: 0.997 })
  })
})

describe('reading a grid built from roles', () => {
  /** A grid the way `helix-table` writes one, columns beside the rows. */
  const grid = (markup: string): Element => {
    const host = document.createElement('div')
    host.innerHTML = markup
    return host.firstElementChild as Element
  }

  test('this library own table is read, though its roles are in ElementInternals', () => {
    /* The reason the selector is a tag and a role rather than either alone.
       `helix-table` sets `role` through `ElementInternals`, which writes no
       attribute at all, so `[role="row"]` matches a hand-rolled grid and finds
       nothing whatsoever in ours. */
    const series = readSeries(
      grid(`<helix-table label="Visits">
        <helix-table-column>Week</helix-table-column>
        <helix-table-column>Direct</helix-table-column>
        <helix-table-column>Search</helix-table-column>
        <helix-table-row>
          <helix-table-cell header>W1</helix-table-cell>
          <helix-table-cell>120</helix-table-cell>
          <helix-table-cell>80</helix-table-cell>
        </helix-table-row>
        <helix-table-row>
          <helix-table-cell header>W2</helix-table-cell>
          <helix-table-cell>140</helix-table-cell>
          <helix-table-cell>96</helix-table-cell>
        </helix-table-row>
      </helix-table>`),
    )
    expect(series.map((one) => one.name)).toEqual(['Direct', 'Search'])
    expect(series[0]?.points.map((p) => p.value)).toEqual([120, 140])
    expect(series[0]?.points.map((p) => p.label)).toEqual(['W1', 'W2'])
  })

  test('a grid written with roles by hand is read the same way', () => {
    const series = readSeries(
      grid(`<div role="table" label="Plans">
        <div role="row">
          <span role="columnheader">Plan</span>
          <span role="columnheader">Accounts</span>
        </div>
        <div role="row">
          <span role="rowheader">Free</span>
          <span role="cell">1840</span>
        </div>
      </div>`),
    )
    expect(series[0]?.name).toBe('Accounts')
    expect(series[0]?.points[0]).toEqual({ label: 'Free', value: 1840 })
  })

  test('data-value wins in a grid too, because the text is for the reader', () => {
    const series = readSeries(
      grid(`<helix-table label="Revenue">
        <helix-table-column>Quarter</helix-table-column>
        <helix-table-column>Total</helix-table-column>
        <helix-table-row>
          <helix-table-cell header>Q1</helix-table-cell>
          <helix-table-cell data-value="1200">$1.2k</helix-table-cell>
        </helix-table-row>
      </helix-table>`),
    )
    expect(series[0]?.points[0]?.value).toBe(1200)
  })

  test('a document table still takes the table path', () => {
    // The two shapes stay separate.
    const series = readSeries(
      table(`<table><tbody><tr><th scope="row">A</th><td>7</td></tr></tbody></table>`),
    )
    expect(series[0]?.points[0]?.value).toBe(7)
  })
})
