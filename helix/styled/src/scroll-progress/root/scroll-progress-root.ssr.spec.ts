import { describe, expect, test } from 'bun:test'
import { hasPart, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('scroll progress server output', () => {
  test('serves the track and the bar, empty until the page runs', () => {
    const served = ssr(html`<helix-scroll-progress></helix-scroll-progress>`)
    expect(hasPart(served, 'track')).toBe(true)
    expect(hasPart(served, 'bar')).toBe(true)
  })
})
