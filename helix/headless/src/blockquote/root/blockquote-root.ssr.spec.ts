import { describe, expect, test } from 'bun:test'
import { hostAttributes, partTag, ssr } from '@fusion-io/testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('blockquote server output', () => {
  test('the quotation is a real blockquote in the served markup', () => {
    const markup = ssr(html`<helix-base-blockquote><p>Said so.</p></helix-base-blockquote>`)
    expect(partTag(markup, 'blockquote')).toContain('<blockquote')
  })

  test('the host carries nothing the consumer did not write', () => {
    const markup = ssr(html`<helix-base-blockquote>x</helix-base-blockquote>`)
    expect(hostAttributes(markup, 'helix-base-blockquote')).toEqual([])
  })
})
