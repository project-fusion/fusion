import { describe, expect, test } from 'bun:test'
import { hasPart, hostAttributes, ssr, withoutStyles } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('line chart server output', () => {
  test('serves its plot, so the box is reserved before the table is read', () => {
    /* The table is light DOM the server cannot see: `getRootNode` resolution is
       client work, so what the server can honestly render is the empty frame
       the drawing will fill. Asserted rather than left undefined, because the
       failure it guards against is a component that reaches for the DOM during
       SSR and throws. */
    const markup = withoutStyles(
      ssr(html`<helix-headless-line-chart for="sessions"></helix-headless-line-chart>`),
    )
    expect(hasPart(markup, 'plot')).toBe(true)
  })

  test('serves no lines, there being no table to read on a server', () => {
    const markup = withoutStyles(
      ssr(html`<helix-headless-line-chart for="sessions"></helix-headless-line-chart>`),
    )
    expect(markup).not.toContain('part="line"')
  })

  test('the host carries only what the consumer wrote', () => {
    /* `for` does not reflect, the way `Tooltip.for` does not: it is a property
       in React and nothing styles on it. `curve`, `area` and `zero` do reflect,
       and none of them takes a default that would write itself onto a host
       nobody configured. */
    const markup = ssr(html`<helix-headless-line-chart for="sessions"></helix-headless-line-chart>`)
    expect(hostAttributes(markup, 'helix-headless-line-chart')).toEqual(['for'])
  })

  test('a declared curve reaches the host, since a stylesheet may ask about it', () => {
    const markup = ssr(
      html`<helix-headless-line-chart curve="smooth" for="s"></helix-headless-line-chart>`,
    )
    expect(hostAttributes(markup, 'helix-headless-line-chart')).toEqual(['curve', 'for'])
  })

  /* The id `within` on the tooltip resolves against, so the bubble is clamped
     to the drawing rather than to the viewport. A refactor that drops it breaks
     nothing loudly: `getElementById` returns null, the boundary falls back to
     the viewport, and the bubble goes back to hanging past the plot with no
     error anywhere. */
  test('the plot is named, which is what the tooltip is kept inside', () => {
    const markup = withoutStyles(
      ssr(html`<helix-headless-line-chart for="sessions"></helix-headless-line-chart>`),
    )
    expect(markup).toContain('id="helix-chart-plot"')
  })
})
