import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, part, registerDom, role } from '@fusion-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

const trail = `
  <helix-breadcrumbs>
    <helix-breadcrumb><a href="/">Home</a></helix-breadcrumb>
    <helix-breadcrumb><a href="/work">Work</a></helix-breadcrumb>
    <helix-breadcrumb current>Helix</helix-breadcrumb>
  </helix-breadcrumbs>`

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
    const crumbs = await mount('<helix-breadcrumbs aria-label="You are here"></helix-breadcrumbs>')
    expect(crumbs.getAttribute('aria-label')).toBe('You are here')
  })

  test('every item is a list item, so the list has contents', async () => {
    const crumbs = await mount(trail)
    const items = [...crumbs.querySelectorAll('helix-breadcrumb')]
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
    const items = [...crumbs.querySelectorAll('helix-breadcrumb')] as HTMLElement[]
    expect(items[0]?.shadowRoot?.querySelector('a')).toBeNull()

    const slotted = items[0]?.querySelector('a')
    expect(slotted?.getAttribute('href')).toBe('/')
  })

  test('the current page is not a link, and says so on the host', async () => {
    // Linking a page to itself is a known screen-reader annoyance, and
    // aria-current is what actually conveys position.
    const crumbs = await mount(trail)
    const current = [...crumbs.querySelectorAll('helix-breadcrumb')][2] as HTMLElement & {
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
    const second = [...crumbs.querySelectorAll('helix-breadcrumb')][1] as HTMLElement
    expect(second.shadowRoot?.querySelector('[part="separator"] svg')).not.toBeNull()

    const replaced = await mount(
      '<helix-breadcrumbs><helix-breadcrumb><span slot="separator">/</span>A</helix-breadcrumb></helix-breadcrumbs>',
    )
    const item = replaced.querySelector('helix-breadcrumb') as HTMLElement
    const slot = item.shadowRoot?.querySelector('slot[name="separator"]') as HTMLSlotElement
    expect(slot.assignedElements()).toHaveLength(1)
  })

  test('each item carries its own separator, hidden from assistive technology', async () => {
    // Every item renders one; CSS hides the first. No index, no coordination.
    const crumbs = await mount(trail)
    const items = [...crumbs.querySelectorAll('helix-breadcrumb')] as HTMLElement[]
    for (const item of items) {
      const separator = item.shadowRoot?.querySelector('[part="separator"]')
      expect(separator).not.toBeNull()
      expect(separator?.getAttribute('aria-hidden')).toBe('true')
    }
  })

  test('the separator can be replaced without touching the parent', async () => {
    const crumbs = await mount(
      '<helix-breadcrumbs><helix-breadcrumb><a href="/">A</a></helix-breadcrumb><helix-breadcrumb><span slot="separator">&rsaquo;</span>B</helix-breadcrumb></helix-breadcrumbs>',
    )
    const second = [...crumbs.querySelectorAll('helix-breadcrumb')][1] as HTMLElement
    const slot = second.shadowRoot?.querySelector('slot[name="separator"]') as HTMLSlotElement
    expect(slot.assignedElements()).toHaveLength(1)
  })
})

/**
 * Collapse, which is `CollapseController` and is the whole reason it exists.
 *
 * Every one of these is a bug that shipped. The trail rendered whole inside a
 * container half its width; watching the items to catch that hung the browser,
 * twice, because hiding an item changes its size and the observer that saw it
 * was what hid it; and once the container was the only thing watched, a
 * collapsed trail could not expand again, because a hidden item measures zero
 * and the arithmetic had nothing to add back.
 *
 * None of it was reachable from `bun test`. Three specs passed for as long as
 * the feature did nothing, because every `offsetWidth` there is zero, which is
 * exactly what the bug looked like.
 */
const collapsing = (width: number) => `
  <div style="inline-size: ${width}px">
    <helix-breadcrumbs collapse>
      <helix-breadcrumb href="/">Home</helix-breadcrumb>
      <helix-breadcrumb overflow>More</helix-breadcrumb>
      <helix-breadcrumb href="/a">Design</helix-breadcrumb>
      <helix-breadcrumb href="/b">Components</helix-breadcrumb>
      <helix-breadcrumb href="/c">Navigation</helix-breadcrumb>
      <helix-breadcrumb current>Breadcrumbs</helix-breadcrumb>
    </helix-breadcrumbs>
  </div>`

const crumbs = (host: HTMLElement): HTMLElement[] => [
  ...host.querySelectorAll<HTMLElement>('helix-breadcrumb:not([overflow])'),
]

const trigger = (host: HTMLElement): HTMLElement =>
  host.querySelector<HTMLElement>('helix-breadcrumb[overflow]') as HTMLElement

const shown = (host: HTMLElement): string[] =>
  crumbs(host)
    .filter((c) => !c.hasAttribute('hidden'))
    .map((c) => c.textContent?.trim() ?? '')

describe('breadcrumbs collapse', () => {
  test.skipIf(!hasLayout())('keeps both ends and hides only the middle', async () => {
    const host = await mount(collapsing(320))
    expect(shown(host)).toEqual(['Home', 'Navigation', 'Breadcrumbs'])
  })

  test.skipIf(!hasLayout())('shows the trigger only while something is behind it', async () => {
    const narrow = await mount(collapsing(320))
    const wide = await mount(collapsing(1200))
    expect([trigger(narrow).hasAttribute('hidden'), trigger(wide).hasAttribute('hidden')]).toEqual([
      false,
      true,
    ])
  })

  /* The one the width cache exists for. A hidden crumb measures zero, so a
     trail that recomputed from the live tree would decide it now fits, show
     everything, decide it does not, and oscillate. */
  test.skipIf(!hasLayout())('expands again when there is room', async () => {
    const host = await mount(collapsing(320))
    const box = host as HTMLElement
    expect(shown(host).length).toBeLessThan(5)
    box.style.inlineSize = '1200px'
    await new Promise((resolve) => setTimeout(resolve, 120))
    expect(shown(host)).toEqual(['Home', 'Design', 'Components', 'Navigation', 'Breadcrumbs'])
  })

  test.skipIf(!hasLayout())('hides nothing without `collapse`', async () => {
    const host = await mount(collapsing(320).replace(' collapse', ''))
    expect(shown(host).length).toBe(5)
  })
})
