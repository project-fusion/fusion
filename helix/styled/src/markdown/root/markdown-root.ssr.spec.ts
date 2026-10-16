import { describe, expect, test } from 'bun:test'
import { hostAttributes, rendered, ssr, withoutStyles } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('markdown server output', () => {
  const served = ssr(html`<helix-markdown text="# A"></helix-markdown>`)

  test('serves a slot for the document', () => {
    expect(rendered(withoutStyles(served), 'helix-markdown')).toMatch(/<slot><\/slot>/)
  })

  test('the host carries nothing the consumer did not write', () => {
    expect(hostAttributes(served, 'helix-markdown')).toEqual(['text'])
  })
})
