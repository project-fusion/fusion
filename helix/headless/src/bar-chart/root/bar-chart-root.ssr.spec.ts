import { describe, expect, test } from 'bun:test'
import { hostAttributes, ssr, withoutStyles } from '@fusion-io/testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('bar chart server output', () => {
  test('the plot ships empty, because resolving an id wants a document', () => {
    /* Every chart reading a table inherits this. The table is ordinary markup
       and is served whole, so what is missing before hydration is the drawing
       and nothing a reader needs. */
    const markup = withoutStyles(
      ssr(html`<helix-base-bar-chart for="revenue"></helix-base-bar-chart>`),
    )
    expect(markup).toContain('part="plot"')
    expect(markup).not.toContain('part="bar"')
  })

  test('the host carries nothing the consumer did not write', () => {
    expect(
      hostAttributes(
        ssr(html`<helix-base-bar-chart></helix-base-bar-chart>`),
        'helix-base-bar-chart',
      ),
    ).toEqual([])
  })
})
