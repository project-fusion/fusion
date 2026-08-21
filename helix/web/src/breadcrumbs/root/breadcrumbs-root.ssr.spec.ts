import { describe, expect, test } from 'bun:test'
import { hostAttributes, partTag, ssr, withoutStyles } from '@fusion-io/testing/ssr'
import { html } from 'lit'
import '../index.js'
/* The overflow crumb holds a menu the consumer wrote, so the server has to be
   able to render one: an unimported tag renders as an inert unknown element. */
import '../../menu/index.js'

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
describe('breadcrumbs overflow, server rendered', () => {
  /* The fold as it is authored: the steps that go, and the menu that replaces
     them, both in the markup. `.examples/overflow.css` swaps them on a
     container query, which is why neither is conditional here. */
  const folding = html`<helix-breadcrumbs>
    <helix-breadcrumb href="/">Home</helix-breadcrumb>
    <helix-breadcrumb overflow>
      <helix-menu label="Hidden steps">
        <helix-menu-item href="/a">A</helix-menu-item>
        <helix-menu-item href="/b">B</helix-menu-item>
      </helix-menu>
    </helix-breadcrumb>
    <helix-breadcrumb data-folds href="/a">A</helix-breadcrumb>
    <helix-breadcrumb data-folds href="/b">B</helix-breadcrumb>
    <helix-breadcrumb current>C</helix-breadcrumb>
  </helix-breadcrumbs>`

  /* The point of removing the measurement. The trail used to ship every crumb
     visible and hide some after hydrating, because there is no width on a
     server, so a folded trail painted wrong on every load. Now the server
     sends both halves and CSS picks, so the first frame is already right. */
  test('sends the folding crumbs and the menu that replaces them', () => {
    const markup = withoutStyles(ssr(folding))
    expect(markup.match(/<helix-breadcrumb[\s>]/g)?.length).toBe(5)
    expect(markup.match(/<helix-menu-item[\s>]/g)?.length).toBe(2)
  })

  test("hides nothing itself, because which crumbs fold is the consumer's", () => {
    const markup = withoutStyles(ssr(folding))
    /* The crumbs' own opening tags, not the string `hidden` anywhere in the
       markup: that also matches `aria-hidden` on every separator. A bare
       `toContain` here passes and fails for reasons unrelated to what is being
       asked. */
    const crumbs = markup.match(/<helix-breadcrumb\s[^>]*>/g) ?? []
    expect(crumbs.filter((tag) => tag.includes('hidden'))).toEqual([])
  })
})
