import { describe, expect, test } from 'bun:test'
import { hostAttributes, ssr, withoutStyles } from '@helix-io/testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('trend server output', () => {
  test('the direction, the metric and the label are all in the served markup', () => {
    const markup = withoutStyles(
      ssr(
        html`<helix-headless-trend direction="up" good="down"
          >40ms<span slot="label">p99 latency</span></helix-headless-trend
        >`,
      ),
    )
    expect(markup).toContain('Up, worse')
    expect(markup).toContain('40ms')
    expect(markup).toContain('p99 latency')
  })

  test('a trend with no direction serves the neutral one', () => {
    // The absent attribute is the neutral case, which the server has to draw
    // the same way the client does or the first paint changes under the reader.
    expect(withoutStyles(ssr(html`<helix-headless-trend>0</helix-headless-trend>`))).toContain(
      'Unchanged',
    )
  })

  test('the host carries nothing the consumer did not write', () => {
    expect(
      hostAttributes(
        ssr(html`<helix-headless-trend>0</helix-headless-trend>`),
        'helix-headless-trend',
      ),
    ).toEqual([])
  })
})
