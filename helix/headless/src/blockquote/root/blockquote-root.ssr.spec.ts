import { describe, expect, test } from 'bun:test'
import { hostAttributes, partTag, rendered, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('blockquote server output', () => {
  test('the quotation is a real blockquote in the served markup', () => {
    const markup = ssr(html`<helix-headless-blockquote><p>Said so.</p></helix-headless-blockquote>`)
    expect(partTag(markup, 'blockquote')).toContain('<blockquote')
  })

  test('the served figure is named by its caption', () => {
    const markup = ssr(
      html`<helix-headless-blockquote>Said so.<span slot="attribution">A</span></helix-headless-blockquote>`,
    )
    expect(partTag(markup, 'figure')).toContain('aria-labelledby="attribution"')
    expect(partTag(markup, 'figure')).toContain('role="figure"')
    expect(partTag(markup, 'figure')).toMatch(/^<div\s/)
    expect(partTag(markup, 'attribution')).toContain('id="attribution"')
  })

  /* A server cannot see a slotted attribution, so words are what it can name
     the figure by before any script runs. */
  test('serves `attribution` as words in the caption that names the figure', () => {
    const markup = ssr(
      html`<helix-headless-blockquote attribution="Maria Lopez">Said so.</helix-headless-blockquote>`,
    )
    expect(partTag(markup, 'figure')).toContain('role="figure"')
    expect(rendered(markup, 'helix-headless-blockquote')).toMatch(/<span>(<!--[^>]*-->)*Maria Lopez/)
  })

  test('the host carries nothing the consumer did not write', () => {
    const markup = ssr(html`<helix-headless-blockquote>x</helix-headless-blockquote>`)
    expect(hostAttributes(markup, 'helix-headless-blockquote')).toEqual([])
  })
})
