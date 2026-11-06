import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, idle, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

/* The stylesheet the element adopts, as text. happy-dom resolves no cascade,
   so what can be held here is that a rule exists rather than that it applied.
   The link, `current` and `select` are the base tier's and are tested there. */
const sheet = (): string => {
  const declared = (customElements.get('helix-navigation-item') as unknown as { styles: unknown })
    .styles
  return (Array.isArray(declared) ? declared : [declared])
    .flat(Number.POSITIVE_INFINITY)
    .map((one) => String((one as { cssText?: string }).cssText ?? ''))
    .join('\n')
}

/** The declarations of the first rule written for `selector`. */
const rule = (selector: string): string => sheet().split(`${selector} {`)[1]?.split('}')[0] ?? ''

describe('navigation item', () => {
  test('reads the hooks the recipe reads for a link of your own', () => {
    for (const hook of [
      '--navigation-item-color',
      '--navigation-item-current-color',
      '--navigation-item-current-font-weight',
      '--navigation-item-font-size',
      '--navigation-item-font-weight',
      '--navigation-item-hover-background-color',
      '--navigation-item-hover-color',
      '--navigation-item-padding-inline',
      '--navigation-item-radius',
    ]) {
      expect(sheet()).toMatch(new RegExp(`var\\(\\s*${hook},`))
    }
  })

  test('stands above the marker, which sits behind every destination', () => {
    expect(rule(':host')).toContain('position: relative')
    expect(rule(':host')).toContain('z-index: var(--helix-layer-raised)')
  })

  test('draws the current page at full strength, and its focus ring inside its box', () => {
    expect(rule(':host([current="page"]) [part="link"]')).toContain(
      '--navigation-item-current-color',
    )
    expect(rule('[part="link"]:focus-visible')).toContain('outline-offset: calc(')
  })

  if (hasLayout()) {
    /* The item and a link of your own, in one bar, draw alike. */
    test('in a browser, stands in a bar as a link of your own stands', async () => {
      const nav = await mount(`<helix-navigation label="Sections">
        <helix-navigation-item current="page" href="#one">Overview</helix-navigation-item>
        <a aria-current="page" href="#two">Overview</a>
      </helix-navigation>`)
      await idle()
      const item = nav.querySelector('helix-navigation-item') as HTMLElement
      const own = nav.querySelector('a') as HTMLElement
      const drawn = getComputedStyle(part(item, 'link') as HTMLElement)
      const mine = getComputedStyle(own)
      expect(item.getBoundingClientRect().height).toBe(own.getBoundingClientRect().height)
      expect(item.getBoundingClientRect().width).toBe(own.getBoundingClientRect().width)
      expect(drawn.fontSize).toBe(mine.fontSize)
      expect(drawn.paddingInlineStart).toBe(mine.paddingInlineStart)
      expect(drawn.borderTopLeftRadius).toBe(mine.borderTopLeftRadius)
    })

    test('in a browser, fills a column and reads from its start', async () => {
      const nav = await mount(`<helix-navigation label="Sections" orientation="vertical"
        style="inline-size: 12rem">
        <helix-navigation-item href="#one">One</helix-navigation-item>
        <helix-navigation-item current="page" href="#two">Two</helix-navigation-item>
      </helix-navigation>`)
      await idle()
      const item = nav.querySelector('helix-navigation-item') as HTMLElement
      const column = (part(nav, 'nav') as HTMLElement).getBoundingClientRect()
      expect(Math.round(item.getBoundingClientRect().width)).toBe(Math.round(column.width))
      expect(getComputedStyle(part(item, 'link') as HTMLElement).justifyContent).toBe('start')
    })

    test('in a browser, keeps inside a segmented track', async () => {
      const nav = await mount(`<helix-navigation label="Sections" variant="segmented">
        <helix-navigation-item current="page" href="#one">One</helix-navigation-item>
        <helix-navigation-item href="#two">Two</helix-navigation-item>
      </helix-navigation>`)
      await idle()
      const track = (part(nav, 'nav') as HTMLElement).getBoundingClientRect()
      for (const item of nav.querySelectorAll('helix-navigation-item')) {
        const box = item.getBoundingClientRect()
        expect(box.top).toBeGreaterThan(track.top)
        expect(box.bottom).toBeLessThan(track.bottom)
      }
    })
  }
})
