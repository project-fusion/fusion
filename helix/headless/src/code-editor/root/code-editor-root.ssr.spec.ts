import { describe, expect, test } from 'bun:test'
import { hostAttributes, partTag, ssr, withoutStyles } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('editor server output', () => {
  const served = ssr(
    html`<helix-headless-code-editor label="Query" value="select 1"></helix-headless-code-editor>`,
  )

  test('serves a text field holding the value, so the editor reads before any script runs', () => {
    expect(partTag(withoutStyles(served), 'control')).toMatch(/^<textarea\s/)
  })

  test('the host carries nothing the consumer did not write', () => {
    expect(hostAttributes(served, 'helix-headless-code-editor')).toEqual(['label', 'value'])
  })
})
