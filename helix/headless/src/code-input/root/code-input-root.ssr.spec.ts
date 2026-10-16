import { describe, expect, test } from 'bun:test'
import { hasPart, partTag, rendered, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('code input server output', () => {
  const served = ssr(
    html`<helix-headless-code-input label="Payload" value="a &lt; b"></helix-headless-code-input>`,
  )

  test('serves the textarea, so the field is usable before hydration', () => {
    expect(partTag(served, 'control')).toMatch(/^<textarea\s/)
  })

  test('serves the code drawn under it, escaped, so the first paint has the text', () => {
    expect(hasPart(served, 'highlight')).toBe(true)
    expect(rendered(served, 'helix-headless-code-input')).toContain('a &lt; b')
  })
})
