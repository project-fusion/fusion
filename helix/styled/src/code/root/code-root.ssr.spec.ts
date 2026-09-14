import { describe, expect, test } from 'bun:test'
import { hostAttributes, partTag, ssr, styles, withoutStyles } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('code server output', () => {
  const served = ssr(html`<helix-code>data-density</helix-code>`)
  const markup = withoutStyles(served)

  test('the fragment is a code element with its text before any script runs', () => {
    expect(partTag(markup, 'code')).toMatch(/^<code\s/)
    expect(markup).toContain('data-density')
  })

  test('the host carries nothing the consumer did not write', () => {
    expect(hostAttributes(served, 'helix-code')).toEqual([])
  })

  test('declarative shadow DOM carries the styles', () => {
    expect(markup).toContain('shadowrootmode="open"')
    expect(styles(served)).toContain('--code-size')
  })
})
