import { describe, expect, test } from 'bun:test'
import { rendered, ssr, withoutStyles } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import './index.js'

describe('icon/all server output', () => {
  test('a glyph outside the small set is in the served markup', () => {
    const markup = withoutStyles(ssr(html`<helix-headless-icon name="gear"></helix-headless-icon>`))
    expect(rendered(markup, 'helix-headless-icon')).toContain('<svg')
  })
})
