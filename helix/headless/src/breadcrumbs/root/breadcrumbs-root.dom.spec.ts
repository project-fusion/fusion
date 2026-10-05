import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom, role } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

const trail = `
  <helix-headless-breadcrumbs>
    <helix-headless-breadcrumb><a href="/">Home</a></helix-headless-breadcrumb>
    <helix-headless-breadcrumb><a href="/work">Work</a></helix-headless-breadcrumb>
    <helix-headless-breadcrumb current>Helix</helix-headless-breadcrumb>
  </helix-headless-breadcrumbs>`

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
      '<helix-headless-breadcrumbs aria-label="You are here"></helix-headless-breadcrumbs>',
    )
    expect(crumbs.getAttribute('aria-label')).toBe('You are here')
  })

  test('every item is a list item, so the list has contents', async () => {
    const crumbs = await mount(trail)
    const items = [...crumbs.querySelectorAll('helix-headless-breadcrumb')]
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
    const items = [...crumbs.querySelectorAll('helix-headless-breadcrumb')] as HTMLElement[]
    expect(items[0]?.shadowRoot?.querySelector('a')).toBeNull()

    const slotted = items[0]?.querySelector('a')
    expect(slotted?.getAttribute('href')).toBe('/')
  })

  test('the current page is not a link, and says so on the host', async () => {
    // Linking a page to itself is a known screen-reader annoyance, and
    // aria-current is what actually conveys position.
    const crumbs = await mount(trail)
    const current = [
      ...crumbs.querySelectorAll('helix-headless-breadcrumb'),
    ][2] as unknown as HTMLElement & {
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
    const second = [...crumbs.querySelectorAll('helix-headless-breadcrumb')][1] as HTMLElement
    expect(second.shadowRoot?.querySelector('[part="separator"] svg')).not.toBeNull()

    const replaced = await mount(
      '<helix-headless-breadcrumbs><helix-headless-breadcrumb><span slot="separator">/</span>A</helix-headless-breadcrumb></helix-headless-breadcrumbs>',
    )
    const item = replaced.querySelector('helix-headless-breadcrumb') as HTMLElement
    const slot = item.shadowRoot?.querySelector('slot[name="separator"]') as HTMLSlotElement
    expect(slot.assignedElements()).toHaveLength(1)
  })

  test('each item carries its own separator, hidden from assistive technology', async () => {
    // Every item renders one; CSS hides the first. No index, no coordination.
    const crumbs = await mount(trail)
    const items = [...crumbs.querySelectorAll('helix-headless-breadcrumb')] as HTMLElement[]
    for (const item of items) {
      const separator = item.shadowRoot?.querySelector('[part="separator"]')
      expect(separator).not.toBeNull()
      expect(separator?.getAttribute('aria-hidden')).toBe('true')
    }
  })

  test('the separator can be replaced without touching the parent', async () => {
    const crumbs = await mount(
      '<helix-headless-breadcrumbs><helix-headless-breadcrumb><a href="/">A</a></helix-headless-breadcrumb><helix-headless-breadcrumb><span slot="separator">&rsaquo;</span>B</helix-headless-breadcrumb></helix-headless-breadcrumbs>',
    )
    const second = [...crumbs.querySelectorAll('helix-headless-breadcrumb')][1] as HTMLElement
    const slot = second.shadowRoot?.querySelector('slot[name="separator"]') as HTMLSlotElement
    expect(slot.assignedElements()).toHaveLength(1)
  })
})

describe('the trail without a name of its own', () => {
  /* An unnamed navigation landmark is one a reader cannot choose by name, and
     every example was adding "Breadcrumb" by hand. */
  test('is named Breadcrumb, through internals so the host stays as written', async () => {
    const crumbs = await mount(trail)
    const internals = (crumbs as unknown as { internals: ElementInternals }).internals
    expect(internals.ariaLabel).toBe('Breadcrumb')
    expect(crumbs.hasAttribute('aria-label')).toBe(false)
  })
})

describe('a trail written as data', () => {
  /* React Aria's `items`: a router's matched routes become crumbs with no
     markup written by hand, and the last one is where the reader is. */
  test('draws a crumb for each item, linking all but the last, which is current', async () => {
    const crumbs = await mount('<helix-headless-breadcrumbs></helix-headless-breadcrumbs>')
    ;(crumbs as HTMLElement & { items: unknown }).items = [
      { href: '/', label: 'Home' },
      { href: '/work', label: 'Work' },
      { href: '/work/helix', label: 'Helix' },
    ]
    await (crumbs as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete
    const drawn = [
      ...(crumbs.shadowRoot?.querySelectorAll('helix-headless-breadcrumb') ?? []),
    ] as (HTMLElement & { updateComplete: Promise<unknown> })[]
    await Promise.all(drawn.map((crumb) => crumb.updateComplete))
    expect(drawn.map((crumb) => crumb.textContent)).toEqual(['Home', 'Work', 'Helix'])
    expect(drawn.map((crumb) => crumb.getAttribute('href'))).toEqual(['/', '/work', null])
    expect(drawn.map((crumb) => crumb.hasAttribute('current'))).toEqual([false, false, true])
    expect(drawn[2]?.getAttribute('part')).toBe('crumb crumb-current')
    expect(drawn[0]?.shadowRoot?.querySelector('a[part="link"]')?.getAttribute('href')).toBe('/')
  })
})
