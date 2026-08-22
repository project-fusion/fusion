import { describe, expect, test } from 'bun:test'
import { hasPart, hostAttributes, ssr } from '@fusion-io/testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('spinner server output', () => {
  test('renders its circles on the server', () => {
    const markup = ssr(html`<helix-base-loader></helix-base-loader>`)
    expect(hasPart(markup, 'track')).toBe(true)
    expect(hasPart(markup, 'indicator')).toBe(true)
  })

  test('the host carries nothing the consumer did not write', () => {
    expect(
      hostAttributes(ssr(html`<helix-base-loader></helix-base-loader>`), 'helix-base-loader'),
    ).toEqual([])
  })
})
