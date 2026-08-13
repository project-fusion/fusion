import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom, role } from '@fusion-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

const trail = `
  <helix-breadcrumbs>
    <helix-breadcrumbs-item href="/">Home</helix-breadcrumbs-item>
    <helix-breadcrumbs-item href="/work">Work</helix-breadcrumbs-item>
    <helix-breadcrumbs-item current>Helix</helix-breadcrumbs-item>
  </helix-breadcrumbs>`

describe('breadcrumbs', () => {
  test('is a named landmark wrapping a list', async () => {
    // Named because a page can hold more than one navigation, and landmarks are
    // how a screen-reader user chooses between them.
    const crumbs = await mount(trail)
    expect(part(crumbs, 'nav')?.getAttribute('aria-label')).toBe('Breadcrumb')
    expect(part(crumbs, 'list')?.tagName).toBe('OL')
  })

  test('keeps list semantics that list-style would otherwise strip', async () => {
    const crumbs = await mount(trail)
    expect(part(crumbs, 'list')?.getAttribute('role')).toBe('list')
  })

  test('the landmark can be renamed', async () => {
    const crumbs = await mount('<helix-breadcrumbs label="You are here"></helix-breadcrumbs>')
    expect(part(crumbs, 'nav')?.getAttribute('aria-label')).toBe('You are here')
  })

  test('every item is a list item, so the list has contents', async () => {
    const crumbs = await mount(trail)
    const items = [...crumbs.querySelectorAll('helix-breadcrumbs-item')]
    expect(items).toHaveLength(3)
    for (const item of items) {
      expect(role(item)).toBe('listitem')
    }
  })
})

describe('breadcrumb items', () => {
  test('a step is a link, the current page is not', async () => {
    // Linking a page to itself is a known screen-reader annoyance, and
    // aria-current is what actually conveys position.
    const crumbs = await mount(trail)
    const items = [...crumbs.querySelectorAll('helix-breadcrumbs-item')] as HTMLElement[]
    expect(items[0]?.shadowRoot?.querySelector('a[part="link"]')).not.toBeNull()

    const current = items[2]?.shadowRoot?.querySelector('[part="link"]')
    expect(current?.tagName).toBe('SPAN')
    expect(current?.getAttribute('aria-current')).toBe('page')
  })

  test('an item with no href is text, not an empty link', async () => {
    const crumbs = await mount(
      '<helix-breadcrumbs><helix-breadcrumbs-item>Orphan</helix-breadcrumbs-item></helix-breadcrumbs>',
    )
    const item = crumbs.querySelector('helix-breadcrumbs-item') as HTMLElement
    expect(item.shadowRoot?.querySelector('[part="link"]')?.tagName).toBe('SPAN')
  })

  test('each item carries its own separator, hidden from assistive technology', async () => {
    // Every item renders one; CSS hides the first. No index, no coordination.
    const crumbs = await mount(trail)
    const items = [...crumbs.querySelectorAll('helix-breadcrumbs-item')] as HTMLElement[]
    for (const item of items) {
      const separator = item.shadowRoot?.querySelector('[part="separator"]')
      expect(separator).not.toBeNull()
      expect(separator?.getAttribute('aria-hidden')).toBe('true')
    }
  })

  test('the separator can be replaced without touching the parent', async () => {
    const crumbs = await mount(
      '<helix-breadcrumbs><helix-breadcrumbs-item href="/">A</helix-breadcrumbs-item><helix-breadcrumbs-item><span slot="separator">&rsaquo;</span>B</helix-breadcrumbs-item></helix-breadcrumbs>',
    )
    const second = [...crumbs.querySelectorAll('helix-breadcrumbs-item')][1] as HTMLElement
    const slot = second.shadowRoot?.querySelector('slot[name="separator"]') as HTMLSlotElement
    expect(slot.assignedElements()).toHaveLength(1)
  })
})
