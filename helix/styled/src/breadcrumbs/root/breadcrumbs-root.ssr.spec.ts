import { describe, expect, test } from 'bun:test'
import { hostAttributes, partTag, ssr, styles, withoutStyles } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('breadcrumbs server output', () => {
  const served = ssr(
    html`<helix-breadcrumbs aria-label="Breadcrumb">
      <helix-breadcrumb href="/">Home</helix-breadcrumb>
      <helix-breadcrumb current>Here</helix-breadcrumb>
    </helix-breadcrumbs>`,
  )
  const markup = withoutStyles(served)

  test('the list ships as an ordered list, with the role the sheet would otherwise strip', () => {
    expect(partTag(markup, 'list')).toMatch(/^<ol\s/)
    expect(partTag(markup, 'list')).toContain('role="list"')
  })

  test('a linked crumb is an anchor and the current one is not, decided on the server', () => {
    // A crawler follows the trail without the page running, and the current
    // page is never a link to itself.
    expect(markup).toMatch(/<a\s[^>]*part="link"[^>]*href="\/"/)
    expect(markup).toMatch(/<span\s[^>]*part="link"/)
  })

  test('each crumb serves its separator, hidden from assistive technology', () => {
    expect(partTag(markup, 'separator')).toContain('aria-hidden="true"')
  })

  test('the hosts carry only what the consumer wrote', () => {
    // The landmark and the list item roles go through internals, so neither
    // host gains a `role` the consumer's markup never had.
    expect(hostAttributes(served, 'helix-breadcrumbs')).toEqual(['aria-label'])
    expect(hostAttributes(served, 'helix-breadcrumb')).toEqual(['href'])
  })

  test('declarative shadow DOM carries both sheets', () => {
    expect(markup).toContain('shadowrootmode="open"')
    expect(styles(served)).toContain('--breadcrumbs-gap')
    expect(styles(served)).toContain('--breadcrumbs-separator-color')
  })
})
