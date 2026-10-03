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

  test('carries no attribute of its own', async () => {
    expect((await mount(bar)).getAttributeNames()).toEqual(['label'])
  })
})
