import { describe, expect, test } from 'bun:test'
import { hostAttributes, partTag, ssr, withoutStyles } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('editor server output', () => {
  const served = ssr(html`<helix-editor label="Code"></helix-editor>`)

  test('serves the text field the editor is before an engine connects', () => {
    expect(partTag(withoutStyles(served), 'control')).toMatch(/^<textarea\s/)
  })

  test('the host carries nothing the consumer did not write', () => {
    expect(hostAttributes(served, 'helix-editor')).toEqual(['label'])
  })
})
