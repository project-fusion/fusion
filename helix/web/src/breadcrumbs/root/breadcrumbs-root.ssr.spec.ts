import { describe, expect, test } from 'bun:test'
import { html } from 'lit'
import { hostTag, partTag, ssr, withoutStyles } from '../../testing/ssr.js'
import '../index.js'

const trail = html`<helix-breadcrumbs>
  <helix-breadcrumbs-item href="/">Home</helix-breadcrumbs-item>
  <helix-breadcrumbs-item current>Helix</helix-breadcrumbs-item>
</helix-breadcrumbs>`

describe('breadcrumbs server output', () => {
  test('the landmark and its name are in the served markup', () => {
    const markup = ssr(trail)
    expect(partTag(markup, 'nav')).toContain('aria-label="Breadcrumb"')
    expect(partTag(markup, 'list')).toContain('role="list"')
  })

  test('the list-item role is on the host, written before hydration', () => {
    // Set in `willUpdate`, which the server does call, unlike
    // `connectedCallback`. Without it the list would have no items.
    expect(hostTag(ssr(trail), 'helix-breadcrumbs-item')).toContain('role="listitem"')
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
