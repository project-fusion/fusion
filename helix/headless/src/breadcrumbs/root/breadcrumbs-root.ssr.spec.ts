import { describe, expect, test } from 'bun:test'
import { hostAttributes, partTag, ssr, withoutStyles } from '@helix-io/testing/ssr'
import { html } from 'lit'
import '../index.js'
/* A crumb holds the menu the consumer wrote, so the server has to be able to
   render one: an unimported tag renders as an inert unknown element. */
import '../../menu/index.js'

const trail = html`<helix-base-breadcrumbs>
  <helix-base-breadcrumb><a href="/">Home</a></helix-base-breadcrumb>
  <helix-base-breadcrumb current>Helix</helix-base-breadcrumb>
</helix-base-breadcrumbs>`

describe('breadcrumbs server output', () => {
  test('the list ships with the role that list-style would otherwise strip', () => {
    expect(partTag(ssr(trail), 'list')).toContain('role="list"')
  })

  test('the landmark role is on internals, so the host stays as written', () => {
    expect(hostAttributes(ssr(trail), 'helix-base-breadcrumbs')).toEqual([])
  })

  test('the list-item role is on internals, so the host stays as written', () => {
    // Set in `willUpdate`, which the server does call, unlike
    // `connectedCallback`. Without it the list would have no items.
    expect(hostAttributes(ssr(trail), 'helix-base-breadcrumb')).toEqual([])
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
describe('breadcrumbs fold, server rendered', () => {
  /* The fold as it is authored: a menu in the crumb where the gap belongs. */
  const folded = html`<helix-base-breadcrumbs>
    <helix-base-breadcrumb href="/">Home</helix-base-breadcrumb>
    <helix-base-breadcrumb>
      <helix-base-menu label="Hidden steps">
        <helix-base-menu-item href="/a">A</helix-base-menu-item>
        <helix-base-menu-item href="/b">B</helix-base-menu-item>
      </helix-base-menu>
    </helix-base-breadcrumb>
    <helix-base-breadcrumb current>C</helix-base-breadcrumb>
  </helix-base-breadcrumbs>`

  /* The point of removing the measurement. The trail used to ship every crumb
     visible and hide some after hydrating, because there is no width on a
     server, so a folded trail painted wrong on every load. The fold is markup
     now, so the served HTML is already the arrangement a reader sees. */
  test('serves the fold itself, menu items and all', () => {
    const markup = withoutStyles(ssr(folded))
    expect(markup.match(/<helix-base-breadcrumb[\s>]/g)?.length).toBe(3)
    expect(markup.match(/<helix-base-menu-item[\s>]/g)?.length).toBe(2)
  })

  test("hides nothing itself, because which crumbs fold is the consumer's", () => {
    const markup = withoutStyles(ssr(folded))
    /* The crumbs' own opening tags, not the string `hidden` anywhere in the
       markup: that also matches `aria-hidden` on every separator. A bare
       `toContain` here passes and fails for reasons unrelated to what is being
       asked. */
    const crumbs = markup.match(/<helix-base-breadcrumb\s[^>]*>/g) ?? []
    expect(crumbs.filter((tag) => tag.includes('hidden'))).toEqual([])
  })
})
