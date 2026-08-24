import { describe, expect, test } from 'bun:test'
import { hostAttributes, partTag, ssr } from '@helix-io/testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('kbd server output', () => {
  test('the key is in the served markup', () => {
    expect(partTag(ssr(html`<helix-headless-kbd>K</helix-headless-kbd>`), 'kbd')).toContain('<kbd')
  })

  test('the host carries nothing the consumer did not write', () => {
    expect(
      hostAttributes(ssr(html`<helix-headless-kbd>K</helix-headless-kbd>`), 'helix-headless-kbd'),
    ).toEqual([])
  })
})
