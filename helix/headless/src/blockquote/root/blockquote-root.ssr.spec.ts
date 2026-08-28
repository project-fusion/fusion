import { describe, expect, test } from 'bun:test'
import { hostAttributes, partTag, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('blockquote server output', () => {
  test('the quotation is a real blockquote in the served markup', () => {
    const markup = ssr(html`<helix-headless-blockquote><p>Said so.</p></helix-headless-blockquote>`)
    expect(partTag(markup, 'blockquote')).toContain('<blockquote')
  })

  test('the host carries nothing the consumer did not write', () => {
    const markup = ssr(html`<helix-headless-blockquote>x</helix-headless-blockquote>`)
    expect(hostAttributes(markup, 'helix-headless-blockquote')).toEqual([])
  })
})
