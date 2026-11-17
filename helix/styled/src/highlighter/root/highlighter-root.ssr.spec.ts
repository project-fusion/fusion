import { describe, expect, test } from 'bun:test'
import { hostAttributes, partTag, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('highlighter server output', () => {
  const served = ssr(html`<helix-highlighter>shipped on time</helix-highlighter>`)

  test('serves the words inside a mark', () => {
    expect(partTag(served, 'mark')).toContain('<mark')
  })

  test('the host carries nothing the page did not write', () => {
    expect(hostAttributes(served, 'helix-highlighter')).toEqual([])
  })
})
