import { describe, expect, test } from 'bun:test'
import { hasPart, hostAttributes, partTag, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('pattern server output', () => {
  const served = ssr(html`<helix-pattern><p>Welcome</p></helix-pattern>`)

  test('serves the drawing and the glow, hidden from screen readers', () => {
    expect(hasPart(served, 'motif')).toBe(true)
    expect(partTag(served, 'motif')).toContain('aria-hidden="true"')
    expect(partTag(served, 'glow')).toContain('aria-hidden="true"')
  })

  test('the host carries nothing the page did not write', () => {
    expect(hostAttributes(served, 'helix-pattern')).toEqual([])
  })
})
