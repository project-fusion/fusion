import { describe, expect, test } from 'bun:test'
import { hostAttributes, partTag, servedParts, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('scatter chart server output', () => {
  /* The frame and nothing drawn in it, which is what a chart resolving `for`
     against a document owes a server that has no document. See "A component
     that resolves a document serves the frame" in helix/CONVENTIONS.md.

     A scatter's frame is its plane as well as its plot: the axes and their
     names are read off the table, so their rows stand empty until hydration,
     and the plane is the box that holds the arrangement. */
  test('serves its plane and its plot, and no points', () => {
    const markup = ssr(
      html`<helix-headless-scatter-chart for="pages"></helix-headless-scatter-chart>`,
    )
    expect(servedParts(markup)).toEqual(['plane', 'plot'])
  })

  test('the plane holds the drawing left to right before a script runs', () => {
    /* So a right-to-left page gets the same arrangement served as it gets
       after hydration: here the across is a measure and not the line of text. */
    const markup = ssr(
      html`<helix-headless-scatter-chart for="pages"></helix-headless-scatter-chart>`,
    )
    expect(partTag(markup, 'plane')).toContain('dir="ltr"')
  })

  test('the plot is named, so its box is the boundary a bubble is kept inside', () => {
    const markup = ssr(
      html`<helix-headless-scatter-chart for="pages"></helix-headless-scatter-chart>`,
    )
    expect(partTag(markup, 'plot')).toContain('id="helix-chart-plot"')
  })

  test('the host carries only what the consumer wrote', () => {
    const markup = ssr(
      html`<helix-headless-scatter-chart for="pages"></helix-headless-scatter-chart>`,
    )
    expect(hostAttributes(markup, 'helix-headless-scatter-chart')).toEqual(['for'])
  })
})
