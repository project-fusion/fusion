import { describe, expect, test } from 'bun:test'
import { hostAttributes, servedParts, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('strands stop server output', () => {
  test('serves no parts, because a stop draws nothing', () => {
    expect(
      servedParts(ssr(html`<helix-strands-stop for="hero" variant="fan"></helix-strands-stop>`)),
    ).toEqual([])
  })

  test('carries exactly what it was given', () => {
    expect(
      hostAttributes(
        ssr(html`<helix-strands-stop for="hero" variant="fan"></helix-strands-stop>`),
        'helix-strands-stop',
      ),
    ).toEqual(['for', 'variant'])
  })
})
