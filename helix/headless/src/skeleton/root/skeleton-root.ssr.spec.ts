import { describe, expect, test } from 'bun:test'
import { hasPart, hostAttributes, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('skeleton server output', () => {
  test('the placeholder is in the served markup', () => {
    expect(
      hasPart(ssr(html`<helix-headless-skeleton></helix-headless-skeleton>`), 'skeleton'),
    ).toBe(true)
  })

  test('serves the sheen inside the shape, as a part', () => {
    expect(hasPart(ssr(html`<helix-headless-skeleton></helix-headless-skeleton>`), 'sheen')).toBe(
      true,
    )
  })

  test('the host carries only what the consumer wrote', () => {
    const markup = ssr(html`<helix-headless-skeleton shape="text"></helix-headless-skeleton>`)
    expect(hostAttributes(markup, 'helix-headless-skeleton')).toEqual(['shape'])
  })
})
