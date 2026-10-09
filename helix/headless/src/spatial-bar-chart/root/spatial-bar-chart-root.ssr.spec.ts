import { describe, expect, test } from 'bun:test'
import { hostAttributes, partTag, servedParts, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

/**
 * The server output: the frame and nothing in it, as for every chart that
 * reads its table through `for`. A server has no document to find the table
 * in, so the bars arrive on hydration.
 */

const markup = ssr(
  html`<div>
    <table data-hidden-visually id="signups">
      <caption>Signups</caption>
      <tbody>
        <tr><th scope="row">North</th><td>420</td><td>465</td></tr>
      </tbody>
    </table>
    <helix-headless-spatial-bar-chart for="signups" label="Signups"></helix-headless-spatial-bar-chart>
  </div>`,
)

describe('spatial bar chart server output', () => {
  test('the frame is served and nothing is drawn in it', () => {
    expect(servedParts(markup)).toEqual(['plot'])
  })

  test('the served plot is named', () => {
    expect(partTag(markup, 'plot')).toContain('aria-label="Signups"')
  })

  test('the host writes no attributes of its own', () => {
    expect(hostAttributes(markup, 'helix-headless-spatial-bar-chart')).toEqual(['for', 'label'])
  })
})
