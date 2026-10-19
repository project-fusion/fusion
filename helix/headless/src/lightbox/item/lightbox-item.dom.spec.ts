import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { hasState, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Item = HTMLElement & { current: boolean; label: string; updateComplete: Promise<boolean> }

const item = async (extra = ''): Promise<Item> =>
  (await mount(
    `<helix-headless-lightbox-item value="one" ${extra}><img src="a.jpg" alt="A harbour"></helix-headless-lightbox-item>`,
  )) as Item

describe('lightbox item', () => {
  test('it is hidden until it is the one being shown', async () => {
    const host = await item()
    expect((part(host, 'item') as HTMLElement).hasAttribute('hidden')).toBe(true)

    host.current = true
    await host.updateComplete
    expect((part(host, 'item') as HTMLElement).hasAttribute('hidden')).toBe(false)
  })

  test('hidden rather than unmounted, so what was opened is still there', async () => {
    /* A picture that has already decoded does not decode again when the reader
       walks back to it, and what is in the markup is what a crawler reads. */
    const host = await item()
    expect(host.querySelector('img')).not.toBeNull()
  })

  test('the shown state is a custom state and never a reflected attribute', async () => {
    // The root writes `current`, so reflecting it would put this element's own
    // bookkeeping into markup a consumer never sent.
    const host = await item()
    host.current = true
    await host.updateComplete
    expect(hasState(host, 'current')).toBe(true)
    expect(host.hasAttribute('current')).toBe(false)
  })

  test('a label names the item for the reader who cannot see it', async () => {
    const host = await item('label="A harbour"')
    expect((part(host, 'item') as HTMLElement).getAttribute('aria-label')).toBe('A harbour')
  })

  test('and no label leaves the name to what was slotted', async () => {
    // The consumer's own `<img alt>` is the name in the ordinary case, and an
    // empty `aria-label` on the group would take it away.
    const host = await item()
    expect((part(host, 'item') as HTMLElement).hasAttribute('aria-label')).toBe(false)
  })
})

describe('a lightbox item with a description', () => {
  /* The line under a picture was shown and never said with it. */
  test('is described by it', async () => {
    const host = (await mount(
      '<helix-headless-lightbox-item value="one" label="Harbor"><img src="a.jpg" alt=""><p slot="description">Boats at dusk</p></helix-headless-lightbox-item>',
    )) as Item
    await host.updateComplete
    const group = part(host, 'item') as HTMLElement
    const id = group.getAttribute('aria-describedby') ?? ''
    expect(id).not.toBe('')
    expect(host.shadowRoot?.getElementById(id)?.getAttribute('name')).toBe('description')
  })

  test('and an item without one is described by nothing', async () => {
    const host = await item()
    expect((part(host, 'item') as HTMLElement).hasAttribute('aria-describedby')).toBe(false)
  })
})
