import { describe, expect, test } from 'bun:test'
import { hostAttributes, hostTag, partTag, ssr, withoutStyles } from '@fusion-io/testing/ssr'
import { html } from 'lit'
import '../index.js'

const trail = html`<helix-breadcrumbs>
  <helix-breadcrumbs-item href="/">Home</helix-breadcrumbs-item>
  <helix-breadcrumbs-item current>Helix</helix-breadcrumbs-item>
</helix-breadcrumbs>`

describe('breadcrumbs server output', () => {
  test('the list ships with the role that list-style would otherwise strip', () => {
    expect(partTag(ssr(trail), 'list')).toContain('role="list"')
  })

  test('the landmark role is on internals, so the host stays as written', () => {
    expect(hostAttributes(ssr(trail), 'helix-breadcrumbs')).toEqual([])
  })

  test('the list-item role is on internals, so the host stays as written', () => {
    // Set in `willUpdate`, which the server does call, unlike
    // `connectedCallback`. Without it the list would have no items.
    expect(hostAttributes(ssr(trail), 'helix-breadcrumbs-item')).toEqual(['href'])
  })

  test('links are crawlable and the current page is not a link', () => {
    const markup = withoutStyles(ssr(trail))
    expect(markup).toContain('href="/"')
    expect(markup).toContain('aria-current="page"')
  })

  test('separators ship with the markup rather than being added on connect', () => {
    expect(partTag(ssr(trail), 'separator')).toContain('aria-hidden="true"')
  })
})
