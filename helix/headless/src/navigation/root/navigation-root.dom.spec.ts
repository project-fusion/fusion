import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../megamenu/index.js')
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

describe('the arrow keys', () => {
  /* Radix's navigation menu: the arrows move along the bar's destinations, and
     a megamenu among them is reached at its trigger. */
  const keyed = `<helix-headless-navigation arrows label="Sections">
    <a href="/design">Design</a>
    <helix-headless-megamenu label="Products"><a href="/a">A</a></helix-headless-megamenu>
    <a href="/mind">Mind</a>
  </helix-headless-navigation>`

  const press = (from: Element, key: string): boolean => {
    const event = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      composed: true,
      key,
    })
    from.dispatchEvent(event)
    return event.defaultPrevented
  }

  test('move along the row, reach a megamenu at its trigger, and stop at the ends', async () => {
    const nav = await mount(keyed)
    const [design, mind] = [...nav.querySelectorAll(':scope > a')] as HTMLElement[]
    const mega = nav.querySelector('helix-headless-megamenu') as HTMLElement & {
      updateComplete: Promise<unknown>
    }
    await mega.updateComplete
    design?.focus()
    const trigger = (mega as unknown as { navigationControl: HTMLElement }).navigationControl
    expect(trigger.getAttribute('part')).toBe('trigger')
    expect(press(design as HTMLElement, 'ArrowRight')).toBe(true)
    expect(document.activeElement).toBe(mega)
    press(trigger, 'ArrowRight')
    expect(document.activeElement).toBe(mind ?? null)
    press(mind as HTMLElement, 'ArrowRight')
    expect(document.activeElement).toBe(mind ?? null)
    press(mind as HTMLElement, 'Home')
    expect(document.activeElement).toBe(design ?? null)
  })

  test('leave the other axis to the page, and do nothing unless asked for', async () => {
    const nav = await mount(keyed)
    const design = nav.querySelector('a') as HTMLElement
    expect(press(design, 'ArrowDown')).toBe(false)
    const plain = await mount(bar)
    expect(press(plain.querySelector('a') as HTMLElement, 'ArrowRight')).toBe(false)
  })
})
