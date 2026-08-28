import { describe, expect, test } from 'bun:test'
import { hostAttributes, ssr, withoutStyles } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('empty view server output', () => {
  test('the explanation is in the served markup', () => {
    const markup = withoutStyles(
      ssr(html`<helix-headless-empty><p>No results.</p></helix-headless-empty>`),
    )
    expect(markup).toContain('No results.')
  })

  test('the host carries only what the consumer wrote', () => {
    const markup = ssr(html`<helix-headless-empty no-announce>x</helix-headless-empty>`)
    expect(hostAttributes(markup, 'helix-headless-empty')).toEqual(['no-announce'])
  })
})
