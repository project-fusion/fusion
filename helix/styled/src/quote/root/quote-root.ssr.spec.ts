import { describe, expect, test } from 'bun:test'
import { hostAttributes, partTag, ssr, styles, withoutStyles } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('quote server output', () => {
  test('the q is served with its source, so the marks are there before any script runs', () => {
    const served = ssr(html`<helix-quote cite="https://x.test">dolor</helix-quote>`)
    expect(partTag(served, 'quote')).toMatch(/^<q\s/)
    expect(partTag(served, 'quote')).toContain('cite="https://x.test"')
    expect(withoutStyles(served)).toContain('dolor')
  })

  test('no source leaves no empty cite', () => {
    expect(partTag(ssr(html`<helix-quote>dolor</helix-quote>`), 'quote')).not.toContain('cite=')
  })

  test('the host carries only what the consumer wrote', () => {
    expect(hostAttributes(ssr(html`<helix-quote>x</helix-quote>`), 'helix-quote')).toEqual([])
    expect(
      hostAttributes(ssr(html`<helix-quote cite="https://x.test">x</helix-quote>`), 'helix-quote'),
    ).toEqual(['cite'])
  })

  test('declarative shadow DOM carries the styles', () => {
    const served = ssr(html`<helix-quote>x</helix-quote>`)
    expect(withoutStyles(served)).toContain('shadowrootmode="open"')
    expect(styles(served)).toContain('--quote-color')
  })
})
