import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import {
  hasState,
  internalsOf,
  mount,
  notYetDefined,
  part,
  registerDom,
  role,
} from '@fusion.dev/helix-testing/dom'

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
    expect(internalsOf(current)?.ariaCurrent).toBe('page')
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
    const internals = internalsOf(crumbs)
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

describe('a long trail written as data', () => {
  type Trail = HTMLElement & { items: unknown; updateComplete: Promise<unknown> }
  /* The crumbs the trail draws. */
  const words = (crumbs: HTMLElement): string[] =>
    [...(crumbs.shadowRoot?.querySelectorAll('helix-headless-breadcrumb') ?? [])].map(
      (crumb) => crumb.textContent?.trim() ?? '',
    )
  /* The first crumb, which draws the fold. */
  const first = (crumbs: HTMLElement) =>
    crumbs.shadowRoot?.querySelector('helix-headless-breadcrumb') as HTMLElement & {
      updateComplete: Promise<unknown>
    }
  /* The rows of the fold's menu, each its link and its words. */
  const rows = async (crumbs: HTMLElement): Promise<string[]> => {
    await first(crumbs).updateComplete
    return [...(first(crumbs).shadowRoot?.querySelectorAll('[part="fold-item"]') ?? [])].map(
      (row) => `${row.getAttribute('href')} ${row.textContent?.trim()}`,
    )
  }

  /* A trail longer than it has room for folds its middle into a menu its
     first crumb draws, the first crumb and the current page always showing. */
  test('folds its middle under max-items into a menu its first crumb draws', async () => {
    const crumbs = (await mount(
      '<helix-headless-breadcrumbs max-items="3"></helix-headless-breadcrumbs>',
    )) as Trail
    crumbs.items = ['Home', 'Docs', 'Guides', 'Forms', 'Validation'].map((label) => ({
      href: `#${label}`,
      label,
    }))
    await crumbs.updateComplete
    expect(words(crumbs)).toEqual(['Home', 'Forms', 'Validation'])
    expect(await rows(crumbs)).toEqual(['#Docs Docs', '#Guides Guides'])
    const button = part(first(crumbs), 'expand') as HTMLElement
    expect(button.getAttribute('label')).toBe('Show 2 more')
    /* The button is the menu's trigger, which a browser's press opens, as
       the styled tier's fold spec presses it where there is layout. */
    expect(button.slot).toBe('trigger')
    /* The mark before the fold is the trail's, as before each crumb. */
    expect(part(first(crumbs), 'fold-separator-mark')?.tagName.toLowerCase()).toBe('svg')
    crumbs.setAttribute('separator', 'slash')
    await crumbs.updateComplete
    await first(crumbs).updateComplete
    expect(part(first(crumbs), 'fold-separator-mark')?.getAttribute('data-mark')).toBe('slash')
    /* A new trail folds again. */
    crumbs.items = ['A', 'B', 'C', 'D'].map((label) => ({ href: `#${label}`, label }))
    await crumbs.updateComplete
    expect(words(crumbs)).toEqual(['A', 'C', 'D'])
    expect(await rows(crumbs)).toEqual(['#B B'])
  })

  test('and a trail no longer than max-items does not fold', async () => {
    const crumbs = (await mount(
      '<helix-headless-breadcrumbs max-items="3"></helix-headless-breadcrumbs>',
    )) as Trail
    crumbs.items = ['A', 'B', 'C'].map((label) => ({ href: `#${label}`, label }))
    await crumbs.updateComplete
    expect(words(crumbs)).toEqual(['A', 'B', 'C'])
    expect(part(first(crumbs), 'expand')).toBeNull()
  })
})

describe('a trail with no crumb marked current', () => {
  type Crumb = HTMLElement & { implied: boolean; updateComplete: Promise<unknown> }
  const implied = async (markup: string): Promise<boolean[]> => {
    const host = await mount(markup)
    const crumbs = [...host.children] as Crumb[]
    await Promise.all(crumbs.map((one) => one.updateComplete))
    return crumbs.map((one) => one.implied)
  }

  test('says its last crumb is the current page', async () => {
    expect(
      await implied(`<helix-headless-breadcrumbs>
        <helix-headless-breadcrumb href="/">Home</helix-headless-breadcrumb>
        <helix-headless-breadcrumb href="/work">Work</helix-headless-breadcrumb>
      </helix-headless-breadcrumbs>`),
    ).toEqual([false, true])
  })

  test('and leaves a trail that marks one alone', async () => {
    expect(await implied(trail)).toEqual([false, false, false])
  })
})

describe('a long slotted trail', () => {
  type Crumb = HTMLElement & { updateComplete: Promise<unknown> }
  type Trail = HTMLElement & { updateComplete: Promise<unknown> }
  const settle = async (host: Trail): Promise<Crumb[]> => {
    const crumbs = [...host.children] as Crumb[]
    for (let round = 0; round < 3; round += 1) {
      await host.updateComplete
      await Promise.all(crumbs.map((one) => one.updateComplete))
    }
    return crumbs
  }
  const long = `<helix-headless-breadcrumbs max-items="3">
      <helix-headless-breadcrumb href="/">Home</helix-headless-breadcrumb>
      <helix-headless-breadcrumb href="/docs">Docs</helix-headless-breadcrumb>
      <helix-headless-breadcrumb href="/guides">Guides</helix-headless-breadcrumb>
      <helix-headless-breadcrumb href="/forms">Forms</helix-headless-breadcrumb>
      <helix-headless-breadcrumb current>Validation</helix-headless-breadcrumb>
    </helix-headless-breadcrumbs>`

  /* As a drawn trail folds: the first crumb, a button, and the last max-items
     less one. The fold follows the first crumb, so the trail reads in order,
     and its menu lists the crumbs folded, each a link to its crumb. */
  test('folds its middle under max-items into a menu its button triggers', async () => {
    const host = (await mount(long)) as Trail
    const crumbs = await settle(host)
    expect(crumbs.map((one) => hasState(one, 'folded'))).toEqual([false, true, true, false, false])
    const first = crumbs[0] as Crumb
    const button = part(first, 'expand') as HTMLElement
    expect(button.getAttribute('label')).toBe('Show 2 more')
    const rows = [...(first.shadowRoot?.querySelectorAll('[part="fold-item"]') ?? [])]
    expect(rows.map((row) => `${row.getAttribute('href')} ${row.textContent?.trim()}`)).toEqual([
      '/docs Docs',
      '/guides Guides',
    ])
    expect(button.slot).toBe('trigger')
    expect(button.parentElement === part(first, 'fold')).toBe(true)
    expect(crumbs.map((one) => hasState(one, 'folded'))).toEqual([false, true, true, false, false])
  })

  test('and a trail no longer than max-items does not fold', async () => {
    const host = (await mount(
      trail.replace('<helix-headless-breadcrumbs>', '<helix-headless-breadcrumbs max-items="3">'),
    )) as Trail
    const crumbs = await settle(host)
    expect(crumbs.some((one) => hasState(one, 'folded'))).toBe(false)
    expect(part(crumbs[0] as Crumb, 'expand')).toBeNull()
  })
})

describe('a crumb a reader presses', () => {
  /* React Aria's onAction, for a router: the press is heard first, and a
     refusal keeps the browser where it is. */
  test('sends helix-before-select with its href, and a refusal keeps the browser from following', async () => {
    const host = await mount(`<helix-headless-breadcrumbs>
      <helix-headless-breadcrumb href="/docs">Docs</helix-headless-breadcrumb>
      <helix-headless-breadcrumb current>Forms</helix-headless-breadcrumb>
    </helix-headless-breadcrumbs>`)
    const crumb = host.firstElementChild as HTMLElement & { updateComplete: Promise<unknown> }
    await crumb.updateComplete
    const heard: string[] = []
    host.addEventListener('helix-before-select', (event) => {
      heard.push((event as CustomEvent<{ value: string }>).detail.value)
      event.preventDefault()
    })
    const click = new MouseEvent('click', {
      bubbles: true,
      button: 0,
      cancelable: true,
      composed: true,
    })
    part(crumb, 'link')?.dispatchEvent(click)
    expect(heard).toEqual(['/docs'])
    expect(click.defaultPrevented).toBe(true)
  })

  test('says it is the current page through a state a sheet can read', async () => {
    const host = await mount(trail)
    const crumbs = [...host.children] as Array<HTMLElement & { updateComplete: Promise<unknown> }>
    await Promise.all(crumbs.map((one) => one.updateComplete))
    expect(crumbs.map((one) => hasState(one, 'current'))).toEqual([false, false, true])
  })
})

describe('a crumb whose definition loads after it was added', () => {
  /* The host hears the definition from `whenDefined`, a microtask after it,
     and both elements then render. */
  const upgraded = async (...elements: Element[]): Promise<void> => {
    for (let round = 0; round < 3; round += 1) {
      await new Promise((done) => setTimeout(done, 0))
      await Promise.all(
        elements.map((one) => (one as Element & { updateComplete?: unknown }).updateComplete),
      )
    }
  }
  test('is the current one once it upgrades, and the one before is not', async () => {
    const trail = await mount(
      '<helix-headless-breadcrumbs><helix-headless-breadcrumb href="/">Home</helix-headless-breadcrumb></helix-headless-breadcrumbs>',
    )
    const first = trail.querySelector('helix-headless-breadcrumb') as HTMLElement
    const late = notYetDefined('helix-headless-breadcrumb')
    Object.assign(late.element, { current: true })
    late.element.textContent = 'Here'
    trail.append(late.element)
    await upgraded(trail)
    late.define()
    await upgraded(trail, first, late.element)
    expect(hasState(late.element, 'current')).toBe(true)
    expect(hasState(first, 'current')).toBe(false)
  })
})

describe('the trail separator', () => {
  const marks = (crumbs: Element) =>
    [...crumbs.querySelectorAll('helix-headless-breadcrumb')].map((crumb) => {
      const mark = part(crumb as HTMLElement, 'separator-mark')
      return mark?.getAttribute('data-mark') ?? mark?.tagName.toLowerCase()
    })

  test('is a chevron unset, and a slash on every crumb under `separator="slash"`', async () => {
    const crumbs = (await mount(trail)) as HTMLElement & {
      separator?: string
      updateComplete: Promise<unknown>
    }
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(marks(crumbs)).toEqual(['svg', 'svg', 'svg'])
    crumbs.separator = 'slash'
    await crumbs.updateComplete
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(crumbs.getAttribute('separator')).toBe('slash')
    expect(marks(crumbs)).toEqual(['slash', 'slash', 'slash'])
    const mark = part(
      crumbs.querySelectorAll('helix-headless-breadcrumb')[1] as HTMLElement,
      'separator-mark',
    )
    expect(mark?.textContent).toBe('/')
  })

  test('draws a slash before each crumb drawn from `items`', async () => {
    const crumbs = (await mount(
      '<helix-headless-breadcrumbs separator="slash"></helix-headless-breadcrumbs>',
    )) as HTMLElement & { items: unknown[]; updateComplete: Promise<unknown> }
    crumbs.items = [{ href: '/', label: 'Home' }, { label: 'Helix' }]
    await crumbs.updateComplete
    const drawn = [
      ...(crumbs.shadowRoot?.querySelectorAll('[part~="crumb"]') ?? []),
    ] as HTMLElement[]
    for (const crumb of drawn) {
      await (crumb as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete
    }
    expect(drawn.map((crumb) => part(crumb, 'separator-mark')?.textContent)).toEqual(['/', '/'])
  })
})
