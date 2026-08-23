import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom, role } from '@helix-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

const trail = `
  <helix-base-breadcrumbs>
    <helix-base-breadcrumb><a href="/">Home</a></helix-base-breadcrumb>
    <helix-base-breadcrumb><a href="/work">Work</a></helix-base-breadcrumb>
    <helix-base-breadcrumb current>Helix</helix-base-breadcrumb>
  </helix-base-breadcrumbs>`

describe('breadcrumbs', () => {
  test('the host is the landmark, wrapping a list', async () => {
    const crumbs = await mount(trail)
    expect(role(crumbs)).toBe('navigation')
    expect(part(crumbs, 'list')?.tagName).toBe('OL')
  })

  test('keeps list semantics that list-style would otherwise strip', async () => {
    const crumbs = await mount(trail)
    expect(part(crumbs, 'list')?.getAttribute('role')).toBe('list')
  })

  test('the landmark is named by `aria-label` on the host', async () => {
    // A page can hold more than one navigation, and landmarks are how a
    // screen-reader user chooses between them. The host is the landmark, so the
    // attribute names it directly and no property mirrors one.
    const crumbs = await mount(
      '<helix-base-breadcrumbs aria-label="You are here"></helix-base-breadcrumbs>',
    )
    expect(crumbs.getAttribute('aria-label')).toBe('You are here')
  })

  test('every item is a list item, so the list has contents', async () => {
    const crumbs = await mount(trail)
    const items = [...crumbs.querySelectorAll('helix-base-breadcrumb')]
    expect(items).toHaveLength(3)
    for (const item of items) {
      expect(role(item)).toBe('listitem')
    }
  })
})

describe('breadcrumb items', () => {
  test("the anchor is the consumer's own, so a router keeps its route", async () => {
    // An anchor rendered into the item's shadow root is unreachable to the
    // framework that owns the route, which is why the item renders none.
    const crumbs = await mount(trail)
    const items = [...crumbs.querySelectorAll('helix-base-breadcrumb')] as HTMLElement[]
    expect(items[0]?.shadowRoot?.querySelector('a')).toBeNull()

    const slotted = items[0]?.querySelector('a')
    expect(slotted?.getAttribute('href')).toBe('/')
  })

  test('the current page is not a link, and says so on the host', async () => {
    // Linking a page to itself is a known screen-reader annoyance, and
    // aria-current is what actually conveys position.
    const crumbs = await mount(trail)
    const current = [...crumbs.querySelectorAll('helix-base-breadcrumb')][2] as HTMLElement & {
      internals?: ElementInternals
    }
    expect(current.querySelector('a')).toBeNull()
    expect(current.internals?.ariaCurrent).toBe('page')
    expect(current.hasAttribute('aria-current')).toBe(false)
  })

  test('the separator is a chevron, and the slot is what replaces it', async () => {
    // The chevron is the slot's own fallback, so a consumer replaces it by
    // filling the slot rather than by turning a default off.
    const crumbs = await mount(trail)
    const second = [...crumbs.querySelectorAll('helix-base-breadcrumb')][1] as HTMLElement
    expect(second.shadowRoot?.querySelector('[part="separator"] svg')).not.toBeNull()

    const replaced = await mount(
      '<helix-base-breadcrumbs><helix-base-breadcrumb><span slot="separator">/</span>A</helix-base-breadcrumb></helix-base-breadcrumbs>',
    )
    const item = replaced.querySelector('helix-base-breadcrumb') as HTMLElement
    const slot = item.shadowRoot?.querySelector('slot[name="separator"]') as HTMLSlotElement
    expect(slot.assignedElements()).toHaveLength(1)
  })

  test('each item carries its own separator, hidden from assistive technology', async () => {
    // Every item renders one; CSS hides the first. No index, no coordination.
    const crumbs = await mount(trail)
    const items = [...crumbs.querySelectorAll('helix-base-breadcrumb')] as HTMLElement[]
    for (const item of items) {
      const separator = item.shadowRoot?.querySelector('[part="separator"]')
      expect(separator).not.toBeNull()
      expect(separator?.getAttribute('aria-hidden')).toBe('true')
    }
  })

  test('the separator can be replaced without touching the parent', async () => {
    const crumbs = await mount(
      '<helix-base-breadcrumbs><helix-base-breadcrumb><a href="/">A</a></helix-base-breadcrumb><helix-base-breadcrumb><span slot="separator">&rsaquo;</span>B</helix-base-breadcrumb></helix-base-breadcrumbs>',
    )
    const second = [...crumbs.querySelectorAll('helix-base-breadcrumb')][1] as HTMLElement
    const slot = second.shadowRoot?.querySelector('slot[name="separator"]') as HTMLSlotElement
    expect(slot.assignedElements()).toHaveLength(1)
  })
})
