import { describe, expect, test } from 'bun:test'
import { hostAttributes, partTag, servedParts, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

/**
 * The server output: the frame and nothing in it, as for every chart that
 * reads its table through `for`. A server has no document to find the table
 * in, so the points arrive on hydration.
 */

const markup = ssr(
  html`<div>
    <table data-hidden-visually id="people">
      <caption>People</caption>
      <tbody>
        <tr><th scope="row">Ada</th><td>36</td><td>4</td><td>81</td></tr>
      </tbody>
    </table>
    <helix-headless-scatter-3d for="people" group-by="Team" label="People"></helix-headless-scatter-3d>
  </div>`,
)

describe('3D scatter server output', () => {
  test('the frame is served and nothing is drawn in it', () => {
    expect(servedParts(markup)).toEqual(['plot'])
  })

  test('the served plot is named', () => {
    expect(partTag(markup, 'plot')).toContain('aria-label="People"')
  })

  test('the host writes no attributes of its own', () => {
    expect(hostAttributes(markup, 'helix-headless-scatter-3d')).toEqual([
      'for',
      'group-by',
      'label',
    ])
  })
})
