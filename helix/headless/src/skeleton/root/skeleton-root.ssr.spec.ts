import { describe, expect, test } from 'bun:test'
import { hasPart, hostAttributes, ssr } from '@fusion-io/testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('skeleton server output', () => {
  test('the placeholder is in the served markup', () => {
    expect(hasPart(ssr(html`<helix-skeleton></helix-skeleton>`), 'skeleton')).toBe(true)
  })

  test('the host carries only what the consumer wrote', () => {
    const markup = ssr(html`<helix-skeleton shape="text"></helix-skeleton>`)
    expect(hostAttributes(markup, 'helix-skeleton')).toEqual(['shape'])
  })
})
