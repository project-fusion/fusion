import { describe, expect, test } from 'bun:test'
import { hasPart, ssr, withoutStyles } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('code server output', () => {
  test('renders its code element with no DOM to read', () => {
    const markup = withoutStyles(ssr(html`<helix-headless-code>one</helix-headless-code>`))
    expect(hasPart(markup, 'code')).toBe(true)
  })
})
