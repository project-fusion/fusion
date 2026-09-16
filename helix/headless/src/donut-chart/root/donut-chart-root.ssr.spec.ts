import { describe, expect, test } from 'bun:test'
import { hostAttributes, partTag, servedParts, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('donut chart server output', () => {
  /* The frame and nothing drawn in it, which is what a chart resolving `for`
     against a document owes a server that has no document. See "A component
     that resolves a document serves the frame" in helix/CONVENTIONS.md.

     A donut's frame is the fullest of the five, because its box is a ring
     rather than a rectangle: the empty track is what makes the plot square,
     and the middle is where the consumer's own total is slotted, which is
     ordinary markup and should be readable before hydration. */
  test('serves its track and its middle, and no slices', () => {
    const markup = ssr(
      html`<helix-headless-donut-chart for="traffic"></helix-headless-donut-chart>`,
    )
    expect(servedParts(markup)).toEqual(['center', 'plot', 'track'])
  })

  test('the plot is named, so its box is the boundary a bubble is kept inside', () => {
    const markup = ssr(
      html`<helix-headless-donut-chart for="traffic"></helix-headless-donut-chart>`,
    )
    expect(partTag(markup, 'plot')).toContain('id="helix-chart-plot"')
  })

  test('the host carries only what the consumer wrote', () => {
    /* `for` does not reflect, the way `Tooltip.for` does not: it is a property
       in React and nothing styles on it. */
    const markup = ssr(
      html`<helix-headless-donut-chart for="traffic"></helix-headless-donut-chart>`,
    )
    expect(hostAttributes(markup, 'helix-headless-donut-chart')).toEqual(['for'])
  })
})
