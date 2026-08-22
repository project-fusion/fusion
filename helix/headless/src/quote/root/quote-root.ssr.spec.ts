import { describe, expect, test } from 'bun:test'
import { hostAttributes, partTag, ssr } from '@fusion-io/testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('quote server output', () => {
  test('the quotation is in the served markup', () => {
    expect(partTag(ssr(html`<helix-quote>said so</helix-quote>`), 'quote')).toContain('<q')
  })

  test('the host carries nothing the consumer did not write', () => {
    expect(hostAttributes(ssr(html`<helix-quote>x</helix-quote>`), 'helix-quote')).toEqual([])
  })
})
