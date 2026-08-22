import { describe, expect, test } from 'bun:test'
import { hasPart, hostAttributes, ssr, withoutStyles } from '@fusion-io/testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('donut chart server output', () => {
  test('serves its track and its middle, so the ring is not a gap that fills in', () => {
    /* The table is light DOM the server cannot see, so the honest output is the
       empty ring and whatever the consumer slotted into it. A total in the hole
       is the consumer's markup and should be readable before hydration. */
    const markup = withoutStyles(
      ssr(html`<helix-base-donut-chart for="traffic"></helix-base-donut-chart>`),
    )
    expect(hasPart(markup, 'track')).toBe(true)
    expect(hasPart(markup, 'centre')).toBe(true)
  })

  test('serves no slices, there being no table to read on a server', () => {
    const markup = withoutStyles(
      ssr(html`<helix-base-donut-chart for="traffic"></helix-base-donut-chart>`),
    )
    expect(markup).not.toContain('part="segment"')
  })

  test('the host carries only what the consumer wrote', () => {
    /* `for` does not reflect, the way `Tooltip.for` does not: it is a property
       in React and nothing styles on it. */
    const markup = ssr(html`<helix-base-donut-chart for="traffic"></helix-base-donut-chart>`)
    expect(hostAttributes(markup, 'helix-base-donut-chart')).toEqual(['for'])
  })
})
