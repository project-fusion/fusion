import { describe, expect, test } from 'bun:test'
import { hostAttributes, partTag, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('quote server output', () => {
  test('the quotation is in the served markup', () => {
    expect(
      partTag(ssr(html`<helix-headless-quote>said so</helix-headless-quote>`), 'quote'),
    ).toContain('<q')
  })

  test('the host carries nothing the consumer did not write', () => {
    expect(
      hostAttributes(
        ssr(html`<helix-headless-quote>x</helix-headless-quote>`),
        'helix-headless-quote',
      ),
    ).toEqual([])
  })
})
