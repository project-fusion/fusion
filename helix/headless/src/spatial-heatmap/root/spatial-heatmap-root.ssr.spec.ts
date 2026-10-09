import { describe, expect, test } from 'bun:test'
import { hostAttributes, partTag, servedParts, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

/**
 * The server output: the frame and no drawing, as for every chart that reads
 * its table through `for`. A server has no document to find the table in, so
 * the prisms arrive on hydration, and the table, which is the reading, is the
 * consumer's markup and served whole.
 */

const markup = ssr(
  html`<div>
    <table data-hidden-visually id="commits">
      <caption>Commits</caption>
      <tbody>
        <tr>
          <th scope="row"><time datetime="2026-08-25">25 Aug</time></th>
          <td>4</td>
        </tr>
      </tbody>
    </table>
    <helix-headless-spatial-heatmap for="commits" label="Commits" rows="7">
      <span slot="start">Aug</span>
    </helix-headless-spatial-heatmap>
  </div>`,
)

describe('spatial heatmap server output', () => {
  /* The frame whole: a spec naming the absences it thought of goes on passing
     when something else is added to the empty render. No drawing, no prisms,
     no tooltip, and no empty state, an unresolved table being unknown rather
     than empty. */
  test('the frame is served and nothing is drawn in it', () => {
    expect(servedParts(markup)).toEqual(['end', 'footer', 'plot', 'start', 'strip', 'summary'])
  })

  test('the served strip is named, and spans no cells yet', () => {
    const strip = partTag(markup, 'strip')
    expect(strip).toContain('aria-label="Commits"')
    expect(strip).toContain('--spatial-heatmap-span: 0')
  })

  /* `flat` and `relief` are read and never written back, so the server adds
     nothing to a host that a hydrating framework would not also have. */
  test('the host writes no attributes of its own', () => {
    const flat = ssr(
      html`<helix-headless-spatial-heatmap flat for="commits" label="Commits"></helix-headless-spatial-heatmap>`,
    )
    expect(hostAttributes(markup, 'helix-headless-spatial-heatmap')).toEqual([
      'for',
      'label',
      'rows',
    ])
    expect(hostAttributes(flat, 'helix-headless-spatial-heatmap')).toEqual(['flat', 'for', 'label'])
  })
})
