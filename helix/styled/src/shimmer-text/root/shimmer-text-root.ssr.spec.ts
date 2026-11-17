import { describe, expect, test } from 'bun:test'
import { hasPart, hostAttributes, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('shimmer text server output', () => {
  test('serves the part the sweep paints through, around the words', () => {
    expect(hasPart(ssr(html`<helix-shimmer-text>Working</helix-shimmer-text>`), 'text')).toBe(true)
  })

  test('the host carries nothing the page did not write', () => {
    expect(
      hostAttributes(
        ssr(html`<helix-shimmer-text>Working</helix-shimmer-text>`),
        'helix-shimmer-text',
      ),
    ).toEqual([])
  })
})
