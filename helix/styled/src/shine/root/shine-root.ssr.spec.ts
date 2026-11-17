import { describe, expect, test } from 'bun:test'
import { hasPart, hostAttributes, partTag, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('shine server output', () => {
  const served = ssr(html`<helix-shine><button>Start</button></helix-shine>`)

  test('serves the band, hidden from screen readers', () => {
    expect(hasPart(served, 'band')).toBe(true)
    expect(partTag(served, 'sweep')).toContain('aria-hidden="true"')
  })

  test('the host carries nothing the page did not write', () => {
    expect(hostAttributes(served, 'helix-shine')).toEqual([])
  })
})
