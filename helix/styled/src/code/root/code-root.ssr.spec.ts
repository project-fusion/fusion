import { describe, expect, test } from 'bun:test'
import {
  hostAttributes,
  partTag,
  rendered,
  ssr,
  styles,
  withoutStyles,
} from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('code server output', () => {
  const served = ssr(html`<helix-code>data-density</helix-code>`)
  const markup = withoutStyles(served)

  test('the fragment is a code element projecting its text before any script runs', () => {
    expect(partTag(markup, 'code')).toMatch(/^<code\s/)
    /* `toContain('data-density')` passed on the host's own text, which is in
       the response whatever the fragment renders. The slot inside the `<code>`
       is what puts the text in the element. */
    expect(rendered(markup, 'helix-code')).toContain('<code part="code"><slot></slot></code>')
  })

  test('the host carries nothing the consumer did not write', () => {
    expect(hostAttributes(served, 'helix-code')).toEqual([])
  })

  test('declarative shadow DOM carries the styles', () => {
    expect(rendered(markup, 'helix-code')).toContain('shadowrootmode="open"')
    expect(styles(served)).toContain('--code-size')
  })
})
