import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Item = HTMLElement & { current?: string | undefined; updateComplete: Promise<unknown> }

const link = (item: Element): HTMLElement | null =>
  part(item as HTMLElement, 'link') as HTMLElement | null

describe('a navigation item', () => {
  test('draws a link to its `href`, with `rel` and `target` where given', async () => {
    const item = await mount(
      '<helix-headless-navigation-item href="#docs" rel="noopener" target="_blank">Docs</helix-headless-navigation-item>',
    )
    expect(link(item)?.tagName).toBe('A')
    expect(link(item)?.getAttribute('href')).toBe('#docs')
    expect(link(item)?.getAttribute('rel')).toBe('noopener')
    expect(link(item)?.getAttribute('target')).toBe('_blank')
  })

  test('draws its words with no link where it has no `href`', async () => {
    const item = await mount(
      '<helix-headless-navigation-item>Docs</helix-headless-navigation-item>',
    )
    expect(link(item)?.tagName).toBe('SPAN')
  })

  test('says it is current on its link, with `aria-current`’s values', async () => {
    const item = (await mount(
      '<helix-headless-navigation-item current="page" href="#docs">Docs</helix-headless-navigation-item>',
    )) as Item
    expect(link(item)?.getAttribute('aria-current')).toBe('page')
    item.current = 'location'
    await item.updateComplete
    expect(link(item)?.getAttribute('aria-current')).toBe('location')
    /* Reflected, so a navigation around it hears the page move it. */
    expect(item.getAttribute('current')).toBe('location')
  })

  test('reads a bare `current` as `true`, and `false` as not current', async () => {
    const bare = await mount(
      '<helix-headless-navigation-item current href="/a">A</helix-headless-navigation-item>',
    )
    expect(link(bare)?.getAttribute('aria-current')).toBe('true')
    const off = await mount(
      '<helix-headless-navigation-item current="false" href="/a">A</helix-headless-navigation-item>',
    )
    expect(link(off)?.hasAttribute('aria-current')).toBe(false)
  })

  test('sends `select` with its `href` on a plain press, before the browser follows', async () => {
    const item = await mount(
      '<helix-headless-navigation-item href="#docs">Docs</helix-headless-navigation-item>',
    )
    const told: unknown[] = []
    item.addEventListener('helix-select', (event) => told.push((event as CustomEvent).detail.value))
    const click = new MouseEvent('click', { bubbles: true, cancelable: true, composed: true })
    link(item)?.dispatchEvent(click)
    expect(told).toEqual(['#docs'])
    expect(click.defaultPrevented).toBe(false)
  })

  test('keeps the browser from following where `select` was refused', async () => {
    const item = await mount(
      '<helix-headless-navigation-item href="#docs">Docs</helix-headless-navigation-item>',
    )
    item.addEventListener('helix-select', (event) => event.preventDefault())
    const click = new MouseEvent('click', { bubbles: true, cancelable: true, composed: true })
    link(item)?.dispatchEvent(click)
    expect(click.defaultPrevented).toBe(true)
  })

  test('sends nothing for a press with a modifier, which the browser opens where it opens it', async () => {
    const item = await mount(
      '<helix-headless-navigation-item href="#docs">Docs</helix-headless-navigation-item>',
    )
    const told: unknown[] = []
    item.addEventListener('helix-select', () => told.push(true))
    /* Kept from opening a window in a browser, after the item has heard it. */
    item.addEventListener('click', (event) => event.preventDefault())
    link(item)?.dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true, composed: true, metaKey: true }),
    )
    expect(told).toEqual([])
  })
})

describe('a navigation of items', () => {
  const bar = `<helix-headless-navigation arrows label="Sections">
    <helix-headless-navigation-item href="/one">One</helix-headless-navigation-item>
    <helix-headless-navigation-item current="page" href="/two">Two</helix-headless-navigation-item>
    <helix-headless-navigation-item href="/three">Three</helix-headless-navigation-item>
  </helix-headless-navigation>`

  /** What the marker is placed on, read from the controller that places it. */
  const marked = (nav: Element): string | undefined =>
    (
      nav as unknown as { indicator: { options: { active(): Element | undefined } } }
    ).indicator.options
      .active()
      ?.textContent?.trim()

  test('puts the marker on the item marked current', async () => {
    expect(marked(await mount(bar))).toBe('Two')
  })

  test('puts it on the item marked `page` where another is marked as well', async () => {
    const nav = await mount(bar.replace('href="/one"', 'current="location" href="/one"'))
    expect(marked(nav)).toBe('Two')
  })

  test('follows the page as it moves `current`', async () => {
    const nav = await mount(bar)
    const [one, two] = [...nav.querySelectorAll('helix-headless-navigation-item')] as Item[]
    if (one === undefined || two === undefined) {
      throw new Error('The bar draws three items.')
    }
    two.current = undefined
    one.current = 'page'
    await Promise.all([one.updateComplete, two.updateComplete])
    expect(marked(nav)).toBe('One')
  })

  test('moves the arrows to each item’s link', async () => {
    const nav = await mount(bar)
    const items = [...nav.querySelectorAll('helix-headless-navigation-item')]
    const first = link(items[0] as Element)
    first?.focus()
    first?.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, composed: true, key: 'End' }),
    )
    expect(items[2]?.shadowRoot?.activeElement).toBe(link(items[2] as Element))
  })

  test('reads an item inside a list item as a destination', async () => {
    const nav = await mount(`<helix-headless-navigation label="Sections">
      <ul role="list">
        <li><helix-headless-navigation-item href="/one">One</helix-headless-navigation-item></li>
        <li><helix-headless-navigation-item current="page" href="/two">Two</helix-headless-navigation-item></li>
      </ul>
    </helix-headless-navigation>`)
    expect(marked(nav)).toBe('Two')
  })
})
