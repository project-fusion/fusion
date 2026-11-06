import { describe, expect, test } from 'bun:test'
import { hostAttributes, servedParts, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('column manager server output', () => {
  test('serves the heading and an empty list, because resolving an id wants a document', () => {
    const markup = ssr(
      html`<helix-headless-column-manager for="invoices"></helix-headless-column-manager>`,
    )
    expect(servedParts(markup)).toEqual(['header', 'list', 'live', 'reset', 'title'])
  })

  test('the host carries nothing the consumer did not write', () => {
    expect(
      hostAttributes(
        ssr(html`<helix-headless-column-manager for="invoices"></helix-headless-column-manager>`),
        'helix-headless-column-manager',
      ),
    ).toEqual(['for'])
  })
})
