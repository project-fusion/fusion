import { describe, expect, test } from 'bun:test'
import { hostAttributes, partTag, servedParts, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

/**
 * The server output: the frame and nothing in it, as for every chart that
 * reads its table through `for`. A server has no document to find the table
 * in, so the grid arrives on hydration.
 */

const markup = ssr(
  html`<div>
    <table data-hidden-visually id="load">
      <caption>Load</caption>
      <tbody>
        <tr><th scope="row">Mon 0h</th><td>0</td><td>1</td><td>10</td></tr>
      </tbody>
    </table>
    <helix-headless-spatial-surface-chart for="load" label="Load"></helix-headless-spatial-surface-chart>
  </div>`,
)

describe('spatial surface chart server output', () => {
  test('the frame is served and nothing is drawn in it', () => {
    expect(servedParts(markup)).toEqual(['plot'])
  })

  test('the served plot is named', () => {
    expect(partTag(markup, 'plot')).toContain('aria-label="Load"')
  })

  test('the host writes no attributes of its own', () => {
    expect(hostAttributes(markup, 'helix-headless-spatial-surface-chart')).toEqual(['for', 'label'])
  })
})
