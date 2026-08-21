import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion-io/testing/dom'
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
