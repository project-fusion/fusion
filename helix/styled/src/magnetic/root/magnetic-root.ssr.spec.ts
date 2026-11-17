import { describe, expect, test } from 'bun:test'
import { hasPart, hostAttributes, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('magnetic server output', () => {
  const served = ssr(html`<helix-magnetic><p>Card</p></helix-magnetic>`)

  test('serves the surface that drifts', () => {
    expect(hasPart(served, 'surface')).toBe(true)
  })

  test('the host carries nothing the page did not write', () => {
    expect(hostAttributes(served, 'helix-magnetic')).toEqual([])
  })
})
