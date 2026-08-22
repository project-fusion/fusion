import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom, role } from '@fusion-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

describe('app header', () => {
  test('is a banner holding three regions, named for where they are', async () => {
    const header = await mount(`
      <helix-base-app-header>
        <span slot="start">Fusion</span>
        <helix-base-navigation><a href="/work">Work</a></helix-base-navigation>
        <helix-base-button slot="end">Contact</helix-base-button>
      </helix-base-app-header>
    `)
    // On the host, since the host is the banner: it carries the material and
    // spans the window, and `row` carries the measure.
    expect(role(header)).toBe('banner')
    expect(part(header, 'start')).not.toBeNull()
    expect(part(header, 'content')).not.toBeNull()
    expect(part(header, 'end')).not.toBeNull()
  })

  test('renders no landmark of its own, because a header is not navigation', async () => {
    // The `<nav>` belongs to `Navigation`, which is what usually goes in the middle
    // but is not what a header inherently is.
    const header = await mount('<helix-base-app-header></helix-base-app-header>')
    expect(header.shadowRoot?.querySelector('nav')).toBeNull()
  })

  test('starts un-scrolled, matching what the server rendered', async () => {
    const header = await mount('<helix-base-app-header></helix-base-app-header>')
    expect(header.hasAttribute('data-scrolled')).toBe(false)
  })

  test('reflects scroll position so styling needs no handler of its own', async () => {
    const header = await mount('<helix-base-app-header></helix-base-app-header>')
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 240 })
    window.dispatchEvent(new Event('scroll'))
    expect(header.hasAttribute('data-scrolled')).toBe(true)

    Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 })
    window.dispatchEvent(new Event('scroll'))
    expect(header.hasAttribute('data-scrolled')).toBe(false)
  })

  test('stops listening once removed', async () => {
    const header = await mount('<helix-base-app-header></helix-base-app-header>')
    header.remove()
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 240 })
    window.dispatchEvent(new Event('scroll'))
    expect(header.hasAttribute('data-scrolled')).toBe(false)
  })
})
