import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

const bar = `<helix-headless-navigation label="Sections">
  <a aria-current="page" data-navigation-item href="/design">Design</a>
  <a data-navigation-item href="/mind">Mind</a>
</helix-headless-navigation>`

describe('nav bar', () => {
  test('wraps its links in a named landmark', async () => {
    const nav = await mount(bar)
    expect(part(nav, 'nav')?.tagName).toBe('NAV')
    expect(part(nav, 'nav')?.getAttribute('aria-label')).toBe('Sections')
  })

  test('the indicator is hidden from assistive technology', async () => {
    // It is a moving mark that repeats what `aria-current` already says.
    const nav = await mount(bar)
    expect(part(nav, 'indicator')?.getAttribute('aria-hidden')).toBe('true')
  })

  test("the current item is the consumer's `aria-current`, not a copy of it", async () => {
    // Marking it twice would let the two drift, and `aria-current` is what
    // navigation actually uses.
    const nav = await mount(bar)
    const current = nav.querySelectorAll('[aria-current="page"]')
    expect(current).toHaveLength(1)
    expect(current[0]?.getAttribute('href')).toBe('/design')
  })
})

describe('naming the landmark', () => {
  /* A footer navigation written the usual way was a second "Main". */
  test('takes its name from an aria-label on the host', async () => {
    const nav = await mount(
      '<helix-headless-navigation aria-label="Footer"><a href="/a">A</a></helix-headless-navigation>',
    )
    expect(part(nav, 'nav')?.getAttribute('aria-label')).toBe('Footer')
  })
})

/* Browser only: the marker is placed by measuring, and happy-dom has no layout. */
const measured = hasLayout() ? test : (): void => {}

describe('the marker on a sidebar of sections', () => {
  measured('follows aria-current="location" as it follows page', async () => {
    const nav = await mount(`<helix-headless-navigation orientation="vertical">
      <a href="#one">One</a><a aria-current="location" href="#two">Two</a>
    </helix-headless-navigation>`)
    await new Promise((resolve) => requestAnimationFrame(resolve))
    expect(part(nav, 'indicator')?.hasAttribute('data-placed')).toBe(true)
  })
})
