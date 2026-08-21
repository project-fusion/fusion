import { describe, expect, test } from 'bun:test'
import { hasPart, hostAttributes, ssr, withoutStyles } from '@fusion-io/testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('line chart server output', () => {
  test('serves its plot, so the box is reserved before the table is read', () => {
    /* The table is light DOM the server cannot see: `getRootNode` resolution is
       client work, so what the server can honestly render is the empty frame
       the drawing will fill. Asserted rather than left undefined, because the
       failure it guards against is a component that reaches for the DOM during
       SSR and throws. */
    const markup = withoutStyles(ssr(html`<helix-line-chart for="sessions"></helix-line-chart>`))
    expect(hasPart(markup, 'plot')).toBe(true)
  })

  test('serves no lines, there being no table to read on a server', () => {
    const markup = withoutStyles(ssr(html`<helix-line-chart for="sessions"></helix-line-chart>`))
    expect(markup).not.toContain('part="line"')
  })

  test('the host carries only what the consumer wrote', () => {
    /* `for` does not reflect, the way `Tooltip.for` does not: it is a property
       in React and nothing styles on it. `curve`, `area` and `zero` do reflect,
       and none of them takes a default that would write itself onto a host
       nobody configured. */
    const markup = ssr(html`<helix-line-chart for="sessions"></helix-line-chart>`)
    expect(hostAttributes(markup, 'helix-line-chart')).toEqual(['for'])
  })

  test('a declared curve reaches the host, since a stylesheet may ask about it', () => {
    const markup = ssr(html`<helix-line-chart curve="smooth" for="s"></helix-line-chart>`)
    expect(hostAttributes(markup, 'helix-line-chart')).toEqual(['curve', 'for'])
  })
})
