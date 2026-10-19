import { describe, expect, test } from 'bun:test'
import { hostAttributes, partTag, ssr, withoutStyles } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('code input server output', () => {
  const served = ssr(html`<helix-code-input label="Payload"></helix-code-input>`)

  test('serves the textarea the reader types in', () => {
    expect(partTag(withoutStyles(served), 'control')).toMatch(/^<textarea\s/)
  })

  test('the host carries nothing the consumer did not write', () => {
    expect(hostAttributes(served, 'helix-code-input')).toEqual(['label'])
  })
})
