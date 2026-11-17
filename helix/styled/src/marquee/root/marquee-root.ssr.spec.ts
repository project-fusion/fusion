import { describe, expect, test } from 'bun:test'
import { hasPart, hostAttributes, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('marquee server output', () => {
  const served = ssr(html`<helix-marquee><span>One</span></helix-marquee>`)

  test('serves the track, the items and the place the copy is drawn', () => {
    expect(hasPart(served, 'track')).toBe(true)
    expect(hasPart(served, 'items')).toBe(true)
    expect(hasPart(served, 'copy')).toBe(true)
  })

  test('the host carries nothing the page did not write', () => {
    expect(hostAttributes(served, 'helix-marquee')).toEqual([])
  })
})
