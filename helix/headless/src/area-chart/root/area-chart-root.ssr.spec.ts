import { describe, expect, test } from 'bun:test'
import { hasPart, hostAttributes, ssr, withoutStyles } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('area chart server output', () => {
  test('serves its plot and no bands, there being no table to read on a server', () => {
    const markup = withoutStyles(
      ssr(html`<helix-headless-area-chart for="visits"></helix-headless-area-chart>`),
    )
    expect(hasPart(markup, 'plot')).toBe(true)
    expect(markup).toContain('id="helix-chart-plot"')
    expect(markup).not.toContain('part="area"')
  })

  test('the host carries only what the consumer wrote', () => {
    const markup = ssr(html`<helix-headless-area-chart for="visits"></helix-headless-area-chart>`)
    expect(hostAttributes(markup, 'helix-headless-area-chart')).toEqual(['for'])
  })
})
