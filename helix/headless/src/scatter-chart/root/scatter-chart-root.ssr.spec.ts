import { describe, expect, test } from 'bun:test'
import { hasPart, hostAttributes, ssr, withoutStyles } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('scatter chart server output', () => {
  test('serves its plot and no points, there being no table to read on a server', () => {
    const markup = withoutStyles(
      ssr(html`<helix-headless-scatter-chart for="pages"></helix-headless-scatter-chart>`),
    )
    expect(hasPart(markup, 'plot')).toBe(true)
    /* In the plane that holds it left to right, so a right-to-left page gets
       the same layout before a script runs as after. */
    expect(markup).toMatch(/<div dir="ltr" part="plane">/)
    expect(markup).toContain('id="helix-chart-plot"')
    expect(markup).not.toContain('part="point"')
  })

  test('the host carries only what the consumer wrote', () => {
    const markup = ssr(
      html`<helix-headless-scatter-chart for="pages"></helix-headless-scatter-chart>`,
    )
    expect(hostAttributes(markup, 'helix-headless-scatter-chart')).toEqual(['for'])
  })
})
