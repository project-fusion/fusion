import { describe, expect, test } from 'bun:test'
import {
  hostAttributes,
  partTag,
  rendered,
  ssr,
  withoutStyles,
} from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'
/* A crumb holds the menu the consumer wrote, so the server has to be able to
   render one: an unimported tag renders as an inert unknown element. */
import '../../menu/index.js'

const trail = html`<helix-headless-breadcrumbs>
  <helix-headless-breadcrumb><a href="/">Home</a></helix-headless-breadcrumb>
  <helix-headless-breadcrumb current>Helix</helix-headless-breadcrumb>
</helix-headless-breadcrumbs>`

describe('breadcrumbs server output', () => {
  test('the list ships with the role that list-style would otherwise strip', () => {
    expect(partTag(ssr(trail), 'list')).toContain('role="list"')
  })

  test('the landmark role is on internals, so the host stays as written', () => {
    expect(hostAttributes(ssr(trail), 'helix-headless-breadcrumbs')).toEqual([])
  })

  test('the list-item role is on internals, so the host stays as written', () => {
    // Set in `willUpdate`, which the server does call, unlike
    // `connectedCallback`. Without it the list would have no items.
    expect(hostAttributes(ssr(trail), 'helix-headless-breadcrumb')).toEqual([])
  })

  test('a crumb serves the slot its link is projected through', () => {
    /* The link sits in the light DOM, so `toContain('href="/"')` read this
       spec's own markup back out of the render: it passed with the crumb
       rendering no slot at all, which assigns the link nowhere. Read off a
       crumb with no children, so the only shadow root here is the crumb's. */
    const crumb = ssr(html`<helix-headless-breadcrumb></helix-headless-breadcrumb>`)
    expect(rendered(crumb, 'helix-headless-breadcrumb')).toMatch(
      /part="link">(<!--[^>]*-->)*<slot name="start"><\/slot><slot><\/slot>/,
    )
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
  const folded = html`<helix-headless-breadcrumbs>
    <helix-headless-breadcrumb href="/">Home</helix-headless-breadcrumb>
    <helix-headless-breadcrumb>
      <helix-headless-menu label="Hidden steps">
        <helix-headless-menu-item href="/a">A</helix-headless-menu-item>
        <helix-headless-menu-item href="/b">B</helix-headless-menu-item>
      </helix-headless-menu>
    </helix-headless-breadcrumb>
    <helix-headless-breadcrumb current>C</helix-headless-breadcrumb>
  </helix-headless-breadcrumbs>`

  /* The fold is markup rather than a measurement, which is the point: a trail
     that shipped every crumb visible and hid some after hydrating would paint
     wrong on every load, there being no width on a server. */
  test('serves the fold itself, menu items and all', () => {
    const markup = withoutStyles(ssr(folded))
    expect(markup.match(/<helix-headless-breadcrumb[\s>]/g)?.length).toBe(3)
    expect(markup.match(/<helix-headless-menu-item[\s>]/g)?.length).toBe(2)
  })

  test("hides nothing itself, because which crumbs fold is the consumer's", () => {
    const markup = withoutStyles(ssr(folded))
    /* The crumbs' own opening tags, not the string `hidden` anywhere in the
       markup: that also matches `aria-hidden` on every separator. A bare
       `toContain` here passes and fails for reasons unrelated to what is being
       asked. */
    const crumbs = markup.match(/<helix-headless-breadcrumb\s[^>]*>/g) ?? []
    expect(crumbs.filter((tag) => tag.includes('hidden'))).toEqual([])
  })
})
