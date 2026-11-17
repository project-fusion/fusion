import { describe, expect, test } from 'bun:test'
import { hasPart, hostAttributes, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('reveal server output', () => {
  const served = ssr(html`<helix-reveal><p>Section</p></helix-reveal>`)

  test('serves the content box, holding the content as it is', () => {
    expect(hasPart(served, 'content')).toBe(true)
  })

  test('the host carries nothing the page did not write', () => {
    expect(hostAttributes(served, 'helix-reveal')).toEqual([])
  })
})
