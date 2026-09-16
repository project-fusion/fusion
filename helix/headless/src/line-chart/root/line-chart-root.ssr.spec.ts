import { describe, expect, test } from 'bun:test'
import { hostAttributes, partTag, servedParts, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('line chart server output', () => {
  /* The frame and nothing drawn in it, which is what a chart resolving `for`
     against a document owes a server that has no document. See "A component
     that resolves a document serves the frame" in helix/CONVENTIONS.md.

     Asserted rather than left undefined, because the other failure it guards
     against is a component that reaches for the DOM during SSR and throws. */
  test('serves its plot and no lines', () => {
    const markup = ssr(html`<helix-headless-line-chart for="sessions"></helix-headless-line-chart>`)
    expect(servedParts(markup)).toEqual(['plot'])
  })

  /* The id `within` on the tooltip resolves against, so the bubble is clamped
     to the drawing rather than to the viewport. A refactor that drops it breaks
     nothing loudly: `getElementById` returns null, the boundary falls back to
     the viewport, and the bubble goes back to hanging past the plot with no
     error anywhere. */
  test('the plot is named, so its box is the boundary a bubble is kept inside', () => {
    const markup = ssr(html`<helix-headless-line-chart for="sessions"></helix-headless-line-chart>`)
    expect(partTag(markup, 'plot')).toContain('id="helix-chart-plot"')
  })

  test('the host carries only what the consumer wrote', () => {
    /* `for` does not reflect, the way `Tooltip.for` does not: it is a property
       in React and nothing styles on it. `curve`, `terminus`, `area` and `zero`
       do reflect, and none of them takes a default that would write itself onto
       a host nobody configured. */
    const markup = ssr(html`<helix-headless-line-chart for="sessions"></helix-headless-line-chart>`)
    expect(hostAttributes(markup, 'helix-headless-line-chart')).toEqual(['for'])
  })

  test('a declared curve reaches the host, since a stylesheet may ask about it', () => {
    const markup = ssr(
      html`<helix-headless-line-chart curve="smooth" for="s"></helix-headless-line-chart>`,
    )
    expect(hostAttributes(markup, 'helix-headless-line-chart')).toEqual(['curve', 'for'])
  })
})
