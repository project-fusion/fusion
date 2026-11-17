import { describe, expect, test } from 'bun:test'
import { hasPart, hostAttributes, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('tilt server output', () => {
  const served = ssr(html`<helix-tilt><p>Card</p></helix-tilt>`)

  test('serves the surface that turns', () => {
    expect(hasPart(served, 'surface')).toBe(true)
  })

  test('the host carries nothing the page did not write', () => {
    expect(hostAttributes(served, 'helix-tilt')).toEqual([])
  })
})
