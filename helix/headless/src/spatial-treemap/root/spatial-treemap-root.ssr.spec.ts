import { describe, expect, test } from 'bun:test'
import { hostAttributes, partTag, servedParts, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

/**
 * The server output: the frame and nothing in it, as for every chart that
 * reads its table through `for`. A server has no document to find the table
 * in, so the blocks arrive on hydration.
 */

const markup = ssr(
  html`<div>
    <table data-hidden-visually id="services">
      <caption>Services</caption>
      <tbody>
        <tr><th scope="row">Search</th><td>Platform</td><td>40</td><td>2</td></tr>
      </tbody>
    </table>
    <helix-headless-spatial-treemap for="services" group-by="Team" label="Services"></helix-headless-spatial-treemap>
  </div>`,
)

describe('spatial treemap server output', () => {
  test('the frame is served and nothing is drawn in it', () => {
    expect(servedParts(markup)).toEqual(['plot'])
  })

  test('the served plot is named', () => {
    expect(partTag(markup, 'plot')).toContain('aria-label="Services"')
  })

  test('the host writes no attributes of its own', () => {
    expect(hostAttributes(markup, 'helix-headless-spatial-treemap')).toEqual([
      'for',
      'group-by',
      'label',
    ])
  })
})
