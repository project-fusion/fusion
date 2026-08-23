import { describe, expect, test } from 'bun:test'
import { hasPart, ssr, withoutStyles } from '@helix-io/testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('code server output', () => {
  test('renders its code element with no DOM to read', () => {
    const markup = withoutStyles(ssr(html`<helix-base-code>one</helix-base-code>`))
    expect(hasPart(markup, 'code')).toBe(true)
  })
})
