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

  if (hasLayout()) {
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
