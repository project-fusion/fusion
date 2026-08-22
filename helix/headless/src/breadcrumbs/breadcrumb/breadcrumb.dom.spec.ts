import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, registerDom } from '@fusion-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

const link = (el: Element) => el.shadowRoot?.querySelector('[part="link"]') as HTMLElement

describe('breadcrumb', () => {
  test('is a span with nowhere to go', async () => {
    const el = await mount('<helix-base-breadcrumb>Home</helix-base-breadcrumb>')
    expect(link(el).tagName).toBe('SPAN')
  })

  test('becomes the link when given one', async () => {
    const el = await mount('<helix-base-breadcrumb href="/a">Home</helix-base-breadcrumb>')
    expect([link(el).tagName, link(el).getAttribute('href')]).toEqual(['A', '/a'])
  })

  /* Linking a page to itself is a known screen-reader annoyance, so `current`
     wins over `href` rather than the two contradicting each other. */
  test('the current page is never a link, whatever it was given', async () => {
    const el = await mount('<helix-base-breadcrumb current href="/a">Here</helix-base-breadcrumb>')
    expect(link(el).tagName).toBe('SPAN')
    /* `aria-current` is not asserted here. It is written through
       `ElementInternals`, which happy-dom does not implement and `registerDom`
       only shims, so reading it back tests the double rather than the
       component. The SSR spec is where host semantics are checked. */
  })

  test('the host stays the list entry, and the anchor never claims it', async () => {
    const el = await mount('<helix-base-breadcrumb href="/a">Home</helix-base-breadcrumb>')
    expect(link(el).getAttribute('role')).toBeNull()
  })

  test('writes target and rel only when asked', async () => {
    const el = await mount('<helix-base-breadcrumb href="/a">Home</helix-base-breadcrumb>')
    expect([link(el).hasAttribute('target'), link(el).hasAttribute('rel')]).toEqual([false, false])
  })
})
