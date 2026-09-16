import { describe, expect, test } from 'bun:test'
import { hasPart, hostAttributes, rendered, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('trend server output', () => {
  test('the direction is drawn, and the metric and the label have slots to arrive through', () => {
    /* The reading is the component's own and comes through `rendered`.
       `toContain('40ms')` and `toContain('p99 latency')` were the spec's own
       light-DOM children, in the document whatever this element rendered, so
       they are the two slots read off a render with no children instead. */
    const markup = rendered(
      ssr(html`<helix-headless-trend direction="up" good="down"></helix-headless-trend>`),
      'helix-headless-trend',
    )
    expect(markup).toContain('<span part="direction">')
    expect(markup).toContain('Up, worse')
    expect(markup).toContain('<slot></slot>')
    expect(markup).toContain('<slot name="label"></slot>')
  })

  test('a trend with no direction serves the neutral one', () => {
    // The absent attribute is the neutral case, which the server has to draw
    // the same way the client does or the first paint changes under the reader.
    const markup = ssr(html`<helix-headless-trend>0</helix-headless-trend>`)
    expect(hasPart(markup, 'direction')).toBe(true)
    expect(rendered(markup, 'helix-headless-trend')).toContain('Unchanged')
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
