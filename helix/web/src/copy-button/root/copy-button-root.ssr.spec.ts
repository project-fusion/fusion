import { describe, expect, test } from 'bun:test'
import { hasPart, ssr, withoutStyles } from '@fusion-io/testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('copy button server output', () => {
  test('renders its button', () => {
    const markup = withoutStyles(
      ssr(html`<helix-copy-button label="Copy" value="one"></helix-copy-button>`),
    )
    expect(hasPart(markup, 'button')).toBe(true)
  })

  /* The server has no clipboard and nobody has pressed anything, so the
     confirmation must not be in the markup. Rendered confirmed, the first paint
     of every page carrying one would claim a copy that never happened, and
     hydration would then quietly take it away. */
  test('never comes up already confirmed', () => {
    const markup = withoutStyles(ssr(html`<helix-copy-button value="one"></helix-copy-button>`))
    expect(markup).not.toContain('data-copied')
  })
})
