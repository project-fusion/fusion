import { describe, expect, test } from 'bun:test'
import { hostAttributes, partTag, ssr } from '@helix-io/testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('quote server output', () => {
  test('the quotation is in the served markup', () => {
    expect(partTag(ssr(html`<helix-base-quote>said so</helix-base-quote>`), 'quote')).toContain(
      '<q',
    )
  })

  test('the host carries nothing the consumer did not write', () => {
    expect(
      hostAttributes(ssr(html`<helix-base-quote>x</helix-base-quote>`), 'helix-base-quote'),
    ).toEqual([])
  })
})
