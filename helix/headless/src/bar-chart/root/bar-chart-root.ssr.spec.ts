import { describe, expect, test } from 'bun:test'
import { hostAttributes, partTag, servedParts, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('bar chart server output', () => {
  /* The frame and nothing drawn in it, which is what a chart resolving `for`
     against a document owes a server that has no document. See "A component
     that resolves a document serves the frame" in helix/CONVENTIONS.md. */
  test('serves its plot and no columns', () => {
    const markup = ssr(html`<helix-headless-bar-chart for="revenue"></helix-headless-bar-chart>`)
    expect(servedParts(markup)).toEqual(['plot'])
  })

  test('the plot is named, so its box is the boundary a bubble is kept inside', () => {
    const markup = ssr(html`<helix-headless-bar-chart for="revenue"></helix-headless-bar-chart>`)
    expect(partTag(markup, 'plot')).toContain('id="helix-chart-plot"')
  })

  test('the host carries nothing the consumer did not write', () => {
    const markup = ssr(html`<helix-headless-bar-chart></helix-headless-bar-chart>`)
    expect(hostAttributes(markup, 'helix-headless-bar-chart')).toEqual([])
  })
})
