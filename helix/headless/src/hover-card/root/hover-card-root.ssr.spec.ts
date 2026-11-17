import { describe, expect, test } from 'bun:test'
import { hasPart, hostAttributes, partTag, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('hover card server output', () => {
  const served = ssr(
    html`<helix-headless-hover-card for="ada"><p>Ada</p></helix-headless-hover-card>`,
  )

  test('serves the card closed, as a popover', () => {
    expect(hasPart(served, 'surface')).toBe(true)
    expect(partTag(served, 'surface')).toContain('popover="manual"')
  })

  test('the host carries nothing the page did not write', () => {
    expect(hostAttributes(served, 'helix-headless-hover-card')).toEqual(['for'])
  })
})
