import { describe, expect, test } from 'bun:test'
import { hostAttributes, ssr, withoutStyles } from '@fusion-io/testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('empty state server output', () => {
  test('the explanation is in the served markup', () => {
    const markup = withoutStyles(
      ssr(html`<helix-empty-state><p>No results.</p></helix-empty-state>`),
    )
    expect(markup).toContain('No results.')
  })

  test('the host carries only what the consumer wrote', () => {
    const markup = ssr(html`<helix-empty-state no-announce>x</helix-empty-state>`)
    expect(hostAttributes(markup, 'helix-empty-state')).toEqual(['no-announce'])
  })
})
