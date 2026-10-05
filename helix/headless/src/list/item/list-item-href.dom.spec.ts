import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

describe('list item href', () => {
  test('is a div with nowhere to go', async () => {
    const el = await mount('<helix-headless-list-item>Row</helix-headless-list-item>')
    expect(el.shadowRoot?.querySelector('[part="row"]')?.tagName).toBe('DIV')
  })

  test('holds the link when given one, and the host stays the list entry', async () => {
    const el = await mount('<helix-headless-list-item href="/a">Row</helix-headless-list-item>')
    const link = el.shadowRoot?.querySelector('[part="row"] > [part="link"]') as HTMLAnchorElement
    expect(link.tagName).toBe('A')
    expect(link.getAttribute('href')).toBe('/a')
    // An <a> carrying listitem would be a link claiming to be a list entry.
    expect(link.getAttribute('role')).toBeNull()
  })

  /* `end` is where a row's own action goes. Inside the link, a delete button
     was a control nested in a link: its words joined the link's name, and a
     click on it followed the link. */
  test('keeps the end slot outside the link, and every other region inside it', async () => {
    const el = await mount('<helix-headless-list-item href="/a">Row</helix-headless-list-item>')
    const link = el.shadowRoot?.querySelector('[part="link"]') as HTMLAnchorElement
    expect(link.querySelector('slot[name="end"]')).toBeNull()
    expect(el.shadowRoot?.querySelector('[part="row"] > slot[name="end"]')).not.toBeNull()
    expect(
      [...link.querySelectorAll('slot')].map((slot) => slot.getAttribute('name') ?? ''),
    ).toEqual(['start', '', 'description'])
  })

  test('writes target and rel only when asked', async () => {
    const bare = await mount('<helix-headless-list-item href="/a">Row</helix-headless-list-item>')
    const row = bare.shadowRoot?.querySelector('[part="link"]') as HTMLAnchorElement
    expect([row.hasAttribute('target'), row.hasAttribute('rel')]).toEqual([false, false])
  })
})
