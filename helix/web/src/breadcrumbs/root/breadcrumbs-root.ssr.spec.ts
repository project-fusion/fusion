import { describe, expect, test } from 'bun:test'
import { hostAttributes, partTag, ssr, withoutStyles } from '@fusion-io/testing/ssr'
import { html } from 'lit'
import '../index.js'

const trail = html`<helix-breadcrumbs>
  <helix-breadcrumb><a href="/">Home</a></helix-breadcrumb>
  <helix-breadcrumb current>Helix</helix-breadcrumb>
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
    expect(hostAttributes(ssr(trail), 'helix-breadcrumb')).toEqual([])
  })

  test('the slotted link is crawlable in the served markup', () => {
    // It sits in the light DOM, so it is in the document rather than behind a
    // declarative shadow root.
    expect(withoutStyles(ssr(trail))).toContain('href="/"')
  })

  test('separators ship with the markup rather than being added on connect', () => {
    expect(partTag(ssr(trail), 'separator')).toContain('aria-hidden="true"')
  })
})

/* The contract that matters most, and the one only a server can prove: the
   trail arrives whole. Collapse needs a width, a server has none, so a reader
   with no JavaScript keeps every crumb and the enhancement can only remove. */
describe('breadcrumbs collapse, server rendered', () => {
  const wide = html`<helix-breadcrumbs collapse>
    <helix-breadcrumb href="/">Home</helix-breadcrumb>
    <helix-breadcrumb href="/a">A</helix-breadcrumb>
    <helix-breadcrumb href="/b">B</helix-breadcrumb>
    <helix-breadcrumb current>C</helix-breadcrumb>
  </helix-breadcrumbs>`

  test('hides no crumb, whatever collapse says', () => {
    const markup = withoutStyles(ssr(wide))
    /* The crumbs' own opening tags, not the string `hidden` anywhere in the
       markup: that also matches `aria-hidden` on every separator and the
       trigger's own `hidden`, which is correct because nothing overflowed. A
       bare `toContain` here passes and fails for reasons unrelated to what is
       being asked. */
    const crumbs = markup.match(/<helix-breadcrumb\s[^>]*>/g) ?? []
    expect(crumbs.filter((tag) => tag.includes('hidden'))).toEqual([])
  })

  test('renders every crumb', () => {
    const markup = withoutStyles(ssr(wide))
    expect(markup.match(/<helix-breadcrumb[\s>]/g)?.length).toBe(4)
  })
})
