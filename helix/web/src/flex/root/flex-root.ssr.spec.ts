import { describe, expect, test } from 'bun:test'
import { hostAttributes, ssr, withoutStyles } from '@fusion-io/testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('flex server output', () => {
  test('layout is plain CSS, so it holds before the element upgrades', () => {
    const markup = withoutStyles(ssr(html`<helix-flex direction="column" gap="md">x</helix-flex>`))
    expect(markup).toContain('direction="column"')
    expect(markup).toContain('gap="md"')
  })

  test('the host carries nothing the consumer did not write', () => {
    // Every axis is a reflected property with no default, so an unset one
    // writes no attribute and hydration has nothing to reconcile.
    expect(hostAttributes(ssr(html`<helix-flex>x</helix-flex>`), 'helix-flex')).toEqual([])
  })

  test('the content is served, not built on the client', () => {
    expect(withoutStyles(ssr(html`<helix-flex>Contents</helix-flex>`))).toContain('Contents')
  })
})
