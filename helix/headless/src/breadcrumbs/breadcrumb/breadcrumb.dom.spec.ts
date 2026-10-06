import { beforeAll, describe, expect, test } from 'bun:test'
import { hasState, mount, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

const link = (el: Element) => el.shadowRoot?.querySelector('[part="link"]') as HTMLElement

describe('breadcrumb', () => {
  test('is a span with nowhere to go', async () => {
    const el = await mount('<helix-headless-breadcrumb>Home</helix-headless-breadcrumb>')
    expect(link(el).tagName).toBe('SPAN')
  })

  test('becomes the link when given one', async () => {
    const el = await mount('<helix-headless-breadcrumb href="/a">Home</helix-headless-breadcrumb>')
    expect([link(el).tagName, link(el).getAttribute('href')]).toEqual(['A', '/a'])
  })

  /* Linking a page to itself is a known screen-reader annoyance, so `current`
     wins over `href` rather than the two contradicting each other. */
  test('the current page is never a link, whatever it was given', async () => {
    const el = await mount(
      '<helix-headless-breadcrumb current href="/a">Here</helix-headless-breadcrumb>',
    )
    expect(link(el).tagName).toBe('SPAN')
    /* `aria-current` is not asserted here. It is written through
       `ElementInternals`, which happy-dom does not implement and `registerDom`
       only shims, so reading it back tests the double rather than the
       component. The SSR spec is where host semantics are checked. */
  })

  test('the host stays the list entry, and the anchor never claims it', async () => {
    const el = await mount('<helix-headless-breadcrumb href="/a">Home</helix-headless-breadcrumb>')
    expect(link(el).getAttribute('role')).toBeNull()
  })

  test('writes target and rel only when asked', async () => {
    const el = await mount('<helix-headless-breadcrumb href="/a">Home</helix-headless-breadcrumb>')
    expect([link(el).hasAttribute('target'), link(el).hasAttribute('rel')]).toEqual([false, false])
  })
})

/* A switcher is a crumb that is two targets: the word navigates and whatever
   sits after it does its own job. That is only possible while `end` renders
   outside the anchor, so these say where it is rather than what it holds. */
describe('the end slot, and why it is where it is', () => {
  test('it is outside the link, so a control there is not nested in an anchor', async () => {
    const el = await mount(
      '<helix-headless-breadcrumb href="/a">Home<button slot="end">Switch</button></helix-headless-breadcrumb>',
    )
    const link = el.shadowRoot?.querySelector('a[part="link"]')
    expect(link).not.toBeNull()
    expect(link?.querySelector('slot[name="end"]')).toBeNull()
    expect(el.shadowRoot?.querySelector('slot[name="end"]')).not.toBeNull()
  })

  /* `start` is part of what the link is called: an icon before the word belongs
     to the word. So the two slots are not symmetric, and this says so. */
  test('start stays inside it, because an icon before the label names the link', async () => {
    const el = await mount('<helix-headless-breadcrumb href="/a">Home</helix-headless-breadcrumb>')
    const link = el.shadowRoot?.querySelector('a[part="link"]')
    expect(link?.querySelector('slot[name="start"]')).not.toBeNull()
  })

  test('and it is outside on a crumb that is not a link either', async () => {
    const el = await mount('<helix-headless-breadcrumb current>Home</helix-headless-breadcrumb>')
    const box = el.shadowRoot?.querySelector('[part="link"]')
    expect(box?.querySelector('slot[name="end"]')).toBeNull()
    expect(el.shadowRoot?.querySelector('slot[name="end"]')).not.toBeNull()
  })
})

/* The state a stylesheet joins the two halves of a switcher on. */
describe('the end state', () => {
  test('is on while end holds something', async () => {
    const el = await mount(
      '<helix-headless-breadcrumb href="/a">Home<button slot="end">Switch</button></helix-headless-breadcrumb>',
    )
    expect(hasState(el, 'end')).toBe(true)
  })

  test('is off on a crumb with nothing after its label', async () => {
    const el = await mount('<helix-headless-breadcrumb href="/a">Home</helix-headless-breadcrumb>')
    expect(hasState(el, 'end')).toBe(false)
  })

  test('follows content that arrives after the first render', async () => {
    const el = (await mount(
      '<helix-headless-breadcrumb href="/a">Home</helix-headless-breadcrumb>',
    )) as HTMLElement & { updateComplete: Promise<boolean> }
    const later = document.createElement('button')
    later.slot = 'end'
    later.textContent = 'Switch'
    el.append(later)
    await el.updateComplete
    await new Promise((resolve) => setTimeout(resolve))
    expect(hasState(el, 'end')).toBe(true)
  })
})
