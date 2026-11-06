import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { hasState, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Item = HTMLElement & { current?: string | undefined; updateComplete: Promise<unknown> }

const link = (item: Element): HTMLElement | null =>
  part(item as HTMLElement, 'link') as HTMLElement | null

const settle = (): Promise<void> => new Promise((done) => setTimeout(done, 0))

describe('a megamenu item', () => {
  test('draws a link to its `href`, with `rel` and `target` where given', async () => {
    const item = await mount(
      '<helix-headless-megamenu-item href="#docs" rel="noopener" target="_blank">Docs</helix-headless-megamenu-item>',
    )
    expect(link(item)?.tagName).toBe('A')
    expect(link(item)?.getAttribute('href')).toBe('#docs')
    expect(link(item)?.getAttribute('rel')).toBe('noopener')
    expect(link(item)?.getAttribute('target')).toBe('_blank')
  })

  test('draws its words with no link where it has no `href`', async () => {
    const item = await mount('<helix-headless-megamenu-item>Docs</helix-headless-megamenu-item>')
    expect(link(item)?.tagName).toBe('SPAN')
  })

  test('holds the icon, the name, and the line about it inside the link', async () => {
    const item = await mount(
      '<helix-headless-megamenu-item href="#docs"><span slot="icon">*</span>Docs<span slot="description">Read the guides.</span></helix-headless-megamenu-item>',
    )
    const inside = link(item)
    expect(inside?.querySelector('slot[name="icon"]')).not.toBeNull()
    expect(inside?.querySelector('[part="name"] slot:not([name])')).not.toBeNull()
    expect(inside?.querySelector('slot[name="description"]')).not.toBeNull()
  })

  test('says which regions it holds, which its two shapes are drawn by', async () => {
    const plain = await mount(
      '<helix-headless-megamenu-item href="#docs">Docs</helix-headless-megamenu-item>',
    )
    await settle()
    expect(hasState(plain, 'has-icon')).toBe(false)
    expect(hasState(plain, 'has-description')).toBe(false)
    const rich = await mount(
      '<helix-headless-megamenu-item href="#docs"><span slot="icon">*</span>Docs<span slot="description">Read the guides.</span></helix-headless-megamenu-item>',
    )
    await settle()
    expect(hasState(rich, 'has-icon')).toBe(true)
    expect(hasState(rich, 'has-description')).toBe(true)
  })

  test('says it is current on its link, and reflects it for the megamenu around', async () => {
    const item = (await mount(
      '<helix-headless-megamenu-item current="page" href="#docs">Docs</helix-headless-megamenu-item>',
    )) as Item
    expect(link(item)?.getAttribute('aria-current')).toBe('page')
    item.current = 'location'
    await item.updateComplete
    expect(link(item)?.getAttribute('aria-current')).toBe('location')
    expect(item.getAttribute('current')).toBe('location')
  })

  test('sends `select` with its `href` on a plain press, and keeps the link where it was refused', async () => {
    const item = await mount(
      '<helix-headless-megamenu-item href="#docs">Docs</helix-headless-megamenu-item>',
    )
    const told: unknown[] = []
    item.addEventListener('helix-select', (event) => told.push((event as CustomEvent).detail.value))
    const click = new MouseEvent('click', { bubbles: true, cancelable: true, composed: true })
    link(item)?.dispatchEvent(click)
    expect(told).toEqual(['#docs'])
    expect(click.defaultPrevented).toBe(false)
    item.addEventListener('helix-select', (event) => event.preventDefault())
    const refused = new MouseEvent('click', { bubbles: true, cancelable: true, composed: true })
    link(item)?.dispatchEvent(refused)
    expect(refused.defaultPrevented).toBe(true)
  })
})
