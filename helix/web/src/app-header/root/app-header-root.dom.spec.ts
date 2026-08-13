import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom, role } from '@fusion-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

describe('app header', () => {
  test('is a banner holding three regions', async () => {
    const header = await mount(`
      <helix-app-header>
        <span slot="brand">Fusion</span>
        <a href="/work">Work</a>
        <helix-button slot="actions">Contact</helix-button>
      </helix-app-header>
    `)
    // On the host, since the host is the banner: it carries the material and
    // spans the window, and `content` carries the measure.
    expect(role(header)).toBe('banner')
    // `<nav>` keeps a wrapper because it is a landmark; brand and actions are
    // bare slots, so an omitted one renders nothing at all.
    expect(part(header, 'nav')?.tagName).toBe('NAV')
    expect(header.shadowRoot?.querySelector('slot[name="brand"]')).not.toBeNull()
    expect(header.shadowRoot?.querySelector('slot[name="actions"]')).not.toBeNull()
  })

  test('starts un-scrolled, matching what the server rendered', async () => {
    const header = await mount('<helix-app-header></helix-app-header>')
    expect(header.hasAttribute('data-scrolled')).toBe(false)
  })

  test('reflects scroll position so styling needs no handler of its own', async () => {
    const header = await mount('<helix-app-header></helix-app-header>')
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 240 })
    window.dispatchEvent(new Event('scroll'))
    expect(header.hasAttribute('data-scrolled')).toBe(true)

    Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 })
    window.dispatchEvent(new Event('scroll'))
    expect(header.hasAttribute('data-scrolled')).toBe(false)
  })

  test('stops listening once removed', async () => {
    const header = await mount('<helix-app-header></helix-app-header>')
    header.remove()
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 240 })
    window.dispatchEvent(new Event('scroll'))
    expect(header.hasAttribute('data-scrolled')).toBe(false)
  })
})
