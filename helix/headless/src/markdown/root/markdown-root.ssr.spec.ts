import { describe, expect, test } from 'bun:test'
import { hostAttributes, rendered, ssr, withoutStyles } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('markdown server output', () => {
  test('serves a slot for the document, and draws nothing of its own', () => {
    const markup = withoutStyles(
      ssr(html`<helix-headless-markdown text="# A"></helix-headless-markdown>`),
    )
    expect(rendered(markup, 'helix-headless-markdown')).toMatch(/<slot><\/slot>/)
  })

  test('the host carries nothing the consumer did not write', () => {
    expect(
      hostAttributes(
        ssr(html`<helix-headless-markdown streaming></helix-headless-markdown>`),
        'helix-headless-markdown',
      ),
    ).toEqual(['streaming'])
  })
})
