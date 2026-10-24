import { describe, expect, test } from 'bun:test'
import { ssr, styles } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

/* Whether the track reaches the end is a browser's question; what a spec can
 * hold is that the sheet gives a slider with marks and no readout a single
 * column, so no gap is kept for a value that is not drawn. */
describe('slider field', () => {
  test('a slider with marks and no readout lays its field out as one column', () => {
    const served = ssr(html`<helix-slider markers="5"></helix-slider>`)
    expect(styles(served)).toContain(':host(:not([show-value])) [part="field"][data-markers]')
  })
})
