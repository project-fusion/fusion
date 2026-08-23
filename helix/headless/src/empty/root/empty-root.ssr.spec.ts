import { describe, expect, test } from 'bun:test'
import { hostAttributes, ssr, withoutStyles } from '@helix-io/testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('empty view server output', () => {
  test('the explanation is in the served markup', () => {
    const markup = withoutStyles(ssr(html`<helix-base-empty><p>No results.</p></helix-base-empty>`))
    expect(markup).toContain('No results.')
  })

  test('the host carries only what the consumer wrote', () => {
    const markup = ssr(html`<helix-base-empty no-announce>x</helix-base-empty>`)
    expect(hostAttributes(markup, 'helix-base-empty')).toEqual(['no-announce'])
  })
})
