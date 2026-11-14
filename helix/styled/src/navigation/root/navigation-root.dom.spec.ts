import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, idle, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

/* The stylesheet the element adopts, as text. happy-dom resolves no cascade,
   so what can be held here is that a rule exists rather than that it applied.
   The landmark, `aria-current` and the marker's measuring are the base tier's
   and are tested there. */
const sheet = (): string => {
  const declared = (customElements.get('helix-navigation') as unknown as { styles: unknown }).styles
  return (Array.isArray(declared) ? declared : [declared])
    .flat(Number.POSITIVE_INFINITY)
    .map((one) => String((one as { cssText?: string }).cssText ?? ''))
    .join('\n')
}

/** The declarations of the first rule written for `selector`. */
const rule = (selector: string): string => sheet().split(`${selector} {`)[1]?.split('}')[0] ?? ''

const bar = `<helix-navigation label="Sections">
  <a aria-current="page" href="#one">One</a>
  <a href="#two">Two</a>
</helix-navigation>`

describe('navigation', () => {
  test('draws the bar and a marker behind it, hidden until it has been placed', async () => {
    /* The server cannot measure, so the marker fades in once it has somewhere
       to be rather than sliding from a wrong place on first paint. */
    const nav = await mount(bar)
    expect(part(nav, 'nav')).not.toBeNull()
    expect(part(nav, 'indicator')).not.toBeNull()
    expect(rule('[part="indicator"]')).toContain('opacity: 0')
    expect(rule('[part="indicator"]')).toContain('position: absolute')
    expect(rule('[part="indicator"][data-placed]')).toContain('opacity: 1')
  })

  test('the marker moves by the numbers the base tier measures', () => {
    // One object that travels rather than a fill that swaps: the numbers are
    // written by the controller and only read here.
    const marker = rule('[part="indicator"]')
    expect(marker).toContain('translate: var(--indicator-x, 0) -50%')
    expect(marker).toContain('inline-size: var(--indicator-inline-size, 0)')
    expect(marker).toContain('block-size: var(--indicator-block-size, 0)')
  })

  test('a long bar scrolls inside itself rather than widening the page', () => {
    expect(rule('[part="nav"]')).toContain('overflow-x: auto')
    expect(rule('[part="nav"]')).toContain('min-inline-size: 0')
    expect(rule('[part="nav"]')).toContain('position: relative')
  })

  test('the hooks the docs name are what the sheet reads', () => {
    for (const hook of ['--navigation-gap', '--navigation-indicator-color']) {
      expect(sheet()).toMatch(new RegExp(`var\\(\\s*${hook},`))
    }
  })

  test('vertical stacks the destinations in a column and moves the marker down it', () => {
    expect(rule(':host([orientation="vertical"]) [part="nav"]')).toContain('flex-direction: column')
    expect(rule(':host([orientation="vertical"]) [part="indicator"]')).toContain(
      'var(--indicator-y, 0)',
    )
  })

  test('underlined draws a rule under the row and the marker as a bar on it', () => {
    expect(rule(':host([marker="underlined"]) [part="nav"]')).toContain('--navigation-rule-color')
    const bar = rule(':host([marker="underlined"]) [part="indicator"]')
    expect(bar).toContain('--navigation-indicator-thickness')
    expect(bar).toContain('inset-block-end: 0')
  })

  test('segmented puts the marker in a sunken, framed track', () => {
    const track = rule(':host([marker="segmented"]) [part="nav"]')
    expect(track).toContain('var(--helix-color-surface-sunken)')
    expect(track).toContain('border: var(--helix-border-thin) solid')
  })

  if (hasLayout()) {
    test('in a browser, underlined puts the bar along the bottom of the current destination', async () => {
      const nav = await mount(`<helix-navigation label="Sections" marker="underlined">
        <a href="#one">One</a>
        <a aria-current="page" href="#two">Two, the longest</a>
      </helix-navigation>`)
      await idle()
      const two = nav.querySelectorAll('a')[1]?.getBoundingClientRect()
      const bar = (part(nav, 'indicator') as HTMLElement).getBoundingClientRect()
      const row = (part(nav, 'nav') as HTMLElement).getBoundingClientRect()
      expect(Math.abs(bar.left - (two?.left ?? 0))).toBeLessThan(1)
      expect(Math.abs(bar.width - (two?.width ?? 0))).toBeLessThan(1)
      expect(Math.abs(bar.bottom - row.bottom)).toBeLessThan(1)
      expect(bar.height).toBeLessThan(4)
    })

    test('in a browser, segmented keeps every destination inside its track', async () => {
      const nav = await mount(`<helix-navigation label="Sections" marker="segmented">
        <a aria-current="page" href="#one">One</a>
        <a href="#two">Two</a>
      </helix-navigation>`)
      await idle()
      const track = (part(nav, 'nav') as HTMLElement).getBoundingClientRect()
      for (const link of nav.querySelectorAll('a')) {
        const box = link.getBoundingClientRect()
        expect(box.top).toBeGreaterThan(track.top)
        expect(box.bottom).toBeLessThan(track.bottom)
      }
      const marker = (part(nav, 'indicator') as HTMLElement).getBoundingClientRect()
      const one = nav.querySelector('a')?.getBoundingClientRect()
      expect(Math.abs(marker.height - (one?.height ?? 0))).toBeLessThan(1)
    })

    test('in a browser, a vertical bar is a column and the marker sits on the current destination', async () => {
      const nav =
        await mount(`<helix-navigation label="Sections" orientation="vertical" style="inline-size: 12rem">
        <a href="#one">One</a>
        <a aria-current="page" href="#two">Two, the longest</a>
        <a href="#three">Three</a>
      </helix-navigation>`)
      await idle()
      const [one, two, three] = [...nav.querySelectorAll('a')].map((link) =>
        link.getBoundingClientRect(),
      )
      /* A column: each below the one before, and every one starting where the column does. */
      expect((two?.top ?? 0) > (one?.top ?? 0)).toBe(true)
      expect((three?.top ?? 0) > (two?.top ?? 0)).toBe(true)
      expect(Math.round(one?.left ?? 0)).toBe(Math.round(three?.left ?? 1))
      const marker = (part(nav, 'indicator') as HTMLElement).getBoundingClientRect()
      expect(Math.abs(marker.top - (two?.top ?? 0))).toBeLessThan(1)
      expect(Math.abs(marker.height - (two?.height ?? 0))).toBeLessThan(1)
    })
  }

  if (hasLayout()) {
    /* The page's link rule colors a slotted destination, since the page's
       styles reach it before the shadow root's, so the hooks are read there. */
    test('in a browser, a destination takes its color from the hooks the docs name', async () => {
      const nav = await mount(`<helix-navigation label="Sections"
        style="--navigation-item-color: rgb(1, 2, 3); --navigation-item-current-color: rgb(4, 5, 6)">
        <a aria-current="page" href="#one">One</a>
        <a href="#two">Two</a>
      </helix-navigation>`)
      await idle()
      const [current, other] = [...nav.querySelectorAll('a')].map(
        (link) => getComputedStyle(link).color,
      )
      expect(current).toBe('rgb(4, 5, 6)')
      expect(other).toBe('rgb(1, 2, 3)')
    })

    test('in a browser, a destination takes its size, weight, space and corner from the hooks', async () => {
      const nav = await mount(`<helix-navigation label="Sections"
        style="--navigation-item-font-size: 17px; --navigation-item-font-weight: 300;
          --navigation-item-current-font-weight: 800; --navigation-item-padding-inline: 13px;
          --navigation-item-radius: 7px">
        <a aria-current="page" href="#one">One</a>
        <a href="#two">Two</a>
      </helix-navigation>`)
      await idle()
      const [current, other] = [...nav.querySelectorAll('a')].map((link) => getComputedStyle(link))
      expect(other?.fontSize).toBe('17px')
      expect(other?.fontWeight).toBe('300')
      expect(current?.fontWeight).toBe('800')
      expect(other?.paddingInlineStart).toBe('13px')
      expect(other?.borderTopLeftRadius).toBe('7px')
    })

    /* No pointer to hold over a link here, so the page's hover rule is read
       for the two hooks it names. */
    test('in a browser, the hover rule reads its two hooks', () => {
      const hover = [...document.styleSheets]
        .flatMap((one) => [...one.cssRules])
        .flatMap((one) => (one instanceof CSSMediaRule ? [...one.cssRules] : [one]))
        .find(
          (one): one is CSSStyleRule =>
            one instanceof CSSStyleRule &&
            one.selectorText.includes('helix-navigation a') &&
            one.selectorText.endsWith(':hover'),
        )
      expect(hover?.style.getPropertyValue('background-color')).toContain(
        '--navigation-item-hover-background-color',
      )
      expect(hover?.style.getPropertyValue('color')).toContain('--navigation-item-hover-color')
    })
  }

  test('carries no attribute of its own', async () => {
    expect((await mount(bar)).getAttributeNames()).toEqual(['label'])
  })
})

/** Waits until `check` holds, a frame at a time, for at most a second. */
const until = async (check: () => boolean): Promise<void> => {
  for (let turn = 0; turn < 60 && !check(); turn += 1) {
    await new Promise((done) => requestAnimationFrame(() => done(undefined)))
  }
}

/** Six destinations, the current one named by `current`. */
const six = (current = 'overview', attributes = ''): string => {
  const names = ['Overview', 'Projects', 'Activity', 'Team', 'Billing', 'Settings']
  return `<helix-navigation label="Sections" ${attributes}>${names
    .map(
      (name) =>
        `<a href="#${name.toLowerCase()}"${name.toLowerCase() === current ? ' aria-current="page"' : ''}>${name}</a>`,
    )
    .join('')}</helix-navigation>`
}

describe('a row too narrow for its destinations', () => {
  test('draws the overflow menu, hidden while nothing has folded', async () => {
    const nav = await mount(six())
    const menu = part(nav, 'overflow') as HTMLElement
    expect(menu?.localName).toBe('helix-menu')
    expect(menu.hidden).toBe(true)
    expect(part(nav, 'more-label')?.textContent).toBe('More')
  })

  test('draws no overflow menu down a column, or where the row scrolls', async () => {
    expect(part(await mount(six('overview', 'orientation="vertical"')), 'overflow')).toBeNull()
    const scrolling = await mount(six('overview', 'overflow="scroll"'))
    expect(part(scrolling, 'overflow')).toBeNull()
    expect(scrolling.getAttribute('overflow')).toBe('scroll')
  })

  if (hasLayout()) {
    /** Six destinations in a box `width` pixels wide, once the row has measured. */
    const narrow = async (
      width: number,
      current = 'overview',
      attributes = '',
    ): Promise<HTMLElement> => {
      document.body.innerHTML = `<div style="inline-size: ${width}px">${six(current, attributes)}</div>`
      const nav = document.body.querySelector('helix-navigation') as HTMLElement & {
        updateComplete: Promise<unknown>
      }
      await nav.updateComplete
      await until(
        () => (part(nav, 'overflow') as HTMLElement | null)?.hidden === false || width > 800,
      )
      await new Promise((done) => requestAnimationFrame(() => done(undefined)))
      return nav
    }

    const links = (nav: HTMLElement): HTMLAnchorElement[] => [...nav.querySelectorAll('a')]

    /** The addresses the overflow menu's rows lead to. */
    const rows = (nav: HTMLElement): string[] =>
      [...(nav.shadowRoot?.querySelectorAll('[part="overflow-option"]') ?? [])].map(
        (row) => row.getAttribute('href') ?? '',
      )

    test('in a browser, folds from the end into More and keeps one row, every destination on it or in the menu', async () => {
      const nav = await narrow(300)
      const box = part(nav, 'nav') as HTMLElement
      expect(box.scrollWidth).toBeLessThanOrEqual(box.clientWidth)
      const shown = links(nav).filter((link) => !link.hidden)
      const folded = links(nav).filter((link) => link.hidden)
      expect(folded.length).toBeGreaterThan(0)
      expect(shown[0]?.textContent).toBe('Overview')
      expect(rows(nav)).toEqual(folded.map((link) => link.getAttribute('href') ?? ''))
      const more = part(nav, 'more') as HTMLElement
      const top = more.getBoundingClientRect().top
      for (const link of shown) {
        expect(Math.abs(link.getBoundingClientRect().top - top)).toBeLessThan(1)
        expect(link.getBoundingClientRect().right).toBeLessThanOrEqual(
          more.getBoundingClientRect().left + 1,
        )
      }
    })

    test('in a browser, keeps the current destination on the row where it would fold', async () => {
      const nav = await narrow(300, 'settings')
      const settings = links(nav).at(-1) as HTMLAnchorElement
      expect(settings.hidden).toBe(false)
      expect(links(nav)[0]?.hidden).toBe(false)
      expect(rows(nav)).not.toContain('#settings')
    })

    test('in a browser, folds every destination where More and the current one do not both fit, and names the current one', async () => {
      const nav = await narrow(120)
      expect(links(nav).every((link) => link.hidden)).toBe(true)
      const more = part(nav, 'more') as HTMLElement
      expect(part(nav, 'more-current')?.textContent).toBe('Overview')
      expect((part(nav, 'more-label') as HTMLElement).hidden).toBe(true)
      expect(more.getAttribute('aria-label')).toBe('Overview, more destinations')
      expect(rows(nav)).toHaveLength(6)
      const current = nav.shadowRoot?.querySelector(
        '[part="overflow-option"][href="#overview"]',
      ) as HTMLElement & {
        checked: boolean
      }
      expect(current.checked).toBe(true)
      /* The marker sits behind the button that names the current destination. */
      const marker = (part(nav, 'indicator') as HTMLElement).getBoundingClientRect()
      expect(Math.abs(marker.left - more.getBoundingClientRect().left)).toBeLessThan(1)
    })

    test('in a browser, draws the button as a glyph alone where even the name does not fit', async () => {
      const nav = await narrow(48)
      const more = part(nav, 'more') as HTMLElement
      expect(more.hasAttribute('data-compact')).toBe(true)
      expect(more.getAttribute('aria-label')).toBe('Overview, more destinations')
      expect((part(nav, 'more-current') as HTMLElement).hidden).toBe(true)
    })

    test('in a browser, shows every destination again once the row widens', async () => {
      const nav = await narrow(300)
      ;(nav.parentElement as HTMLElement).style.inlineSize = '1000px'
      await until(() => links(nav).every((link) => !link.hidden))
      expect(links(nav).every((link) => !link.hidden)).toBe(true)
      expect((part(nav, 'overflow') as HTMLElement).hidden).toBe(true)
    })

    test('in a browser, a scrolling row folds nothing', async () => {
      const nav = await narrow(120, 'overview', 'overflow="scroll"')
      expect(links(nav).every((link) => !link.hidden)).toBe(true)
    })

    test('in a browser, the arrow keys reach More after the last destination on the row', async () => {
      const nav = await narrow(300, 'overview', 'arrows')
      const first = links(nav)[0] as HTMLAnchorElement
      first.focus()
      first.dispatchEvent(
        new KeyboardEvent('keydown', {
          bubbles: true,
          cancelable: true,
          composed: true,
          key: 'End',
        }),
      )
      expect(nav.shadowRoot?.activeElement).toBe(part(nav, 'more'))
    })

    test('in a browser, folds a list of destinations by its items', async () => {
      document.body.innerHTML = `<div style="inline-size: 260px"><helix-navigation label="Sections"><ul role="list">${[
        'Overview',
        'Projects',
        'Activity',
        'Team',
        'Billing',
      ]
        .map(
          (name, at) =>
            `<li><a href="#${at}"${at === 0 ? ' aria-current="page"' : ''}>${name}</a></li>`,
        )
        .join('')}</ul></helix-navigation></div>`
      const nav = document.body.querySelector('helix-navigation') as HTMLElement
      await until(() => (part(nav, 'overflow') as HTMLElement | null)?.hidden === false)
      const items = [...nav.querySelectorAll('li')]
      expect(items.some((item) => item.hidden)).toBe(true)
      expect(items[0]?.hidden).toBe(false)
      expect(rows(nav)).toEqual(
        items
          .filter((item) => item.hidden)
          .map((item) => item.querySelector('a')?.getAttribute('href') ?? ''),
      )
    })
  }
})
