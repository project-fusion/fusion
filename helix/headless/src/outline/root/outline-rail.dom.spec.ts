import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, hasState, mount, registerDom } from '@fusion.dev/helix-testing/dom'

/* Browser only: happy-dom lays nothing out, so no section is readable. */
const inBrowser = hasLayout() ? test : (): void => {}

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Rail = HTMLElement & {
  scrollToSection(id: string): boolean
  updateComplete: Promise<boolean>
}

const FLAT =
  '<a href="#one">One</a><a href="#two" data-level="2">Two</a><a href="#three" data-level="3">Three</a><a href="#four">Four</a>'
const SECTIONS = ['one', 'two', 'three', 'four']
  .map((id) => `<section id="${id}"><h2>${id}</h2></section>`)
  .join('')

const rail = async (attrs = 'marker="rail"', links = FLAT): Promise<Rail> => {
  const root = await mount(
    `<div><helix-headless-outline ${attrs} label="On this page">${links}</helix-headless-outline>${SECTIONS}</div>`,
  )
  const outline = root.querySelector('helix-headless-outline') as Rail
  await outline.updateComplete
  return outline
}

const ticks = (outline: Rail): HTMLElement[] => [
  ...(outline.shadowRoot?.querySelectorAll<HTMLElement>('[part="tick"]') ?? []),
]

const fire = (outline: Rail, type: string, init: EventInit = {}): void => {
  outline.dispatchEvent(new Event(type, init))
}

describe('outline rail', () => {
  test('draws one tick per link, in order', async () => {
    const outline = await rail()
    expect(ticks(outline)).toHaveLength(4)
  })

  test('counts the links of nested lists too', async () => {
    const outline = await rail(
      'marker="rail"',
      '<ul><li><a href="#one">One</a><ul><li><a href="#two">Two</a></li></ul></li><li><a href="#four">Four</a></li></ul>',
    )
    const drawn = ticks(outline)
    expect(drawn).toHaveLength(3)
    expect(drawn.map((tick) => tick.style.getPropertyValue('--outline-depth').trim())).toEqual([
      '1',
      '2',
      '1',
    ])
  })

  test('gives each tick the depth of its link', async () => {
    const outline = await rail()
    const links = [...outline.querySelectorAll('a')]
    const drawn = ticks(outline)
    links.forEach((link, at) => {
      expect(drawn[at]?.style.getPropertyValue('--outline-depth').trim()).toBe(
        link.getAttribute('data-depth') ?? '',
      )
    })
  })

  test('hides the ticks from assistive technology', async () => {
    const outline = await rail()
    const column = outline.shadowRoot?.querySelector('[part="ticks"]')
    expect(column?.getAttribute('aria-hidden')).toBe('true')
    expect(outline.shadowRoot?.querySelector('[part="nav"]')?.getAttribute('aria-label')).toBe(
      'On this page',
    )
  })

  inBrowser('lights the tick of the section a call to scrollToSection marks', async () => {
    const outline = await rail()
    outline.scrollToSection('three')
    await outline.updateComplete
    const lit = ticks(outline).map((tick) => tick.hasAttribute('data-current'))
    expect(lit).toEqual([false, false, true, false])
  })

  test('opens on focus and on the pointer, and Escape closes it', async () => {
    const outline = await rail()
    expect(hasState(outline, 'open')).toBe(false)
    fire(outline, 'focusin', { bubbles: true })
    expect(hasState(outline, 'open')).toBe(true)
    outline.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' }))
    expect(hasState(outline, 'open')).toBe(false)
    fire(outline, 'pointerenter')
    expect(hasState(outline, 'open')).toBe(true)
  })

  test('Escape closes a rail the pointer opened while focus is elsewhere', async () => {
    const outline = await rail()
    fire(outline, 'pointerenter')
    expect(hasState(outline, 'open')).toBe(true)
    document.body.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' }))
    expect(hasState(outline, 'open')).toBe(false)
  })

  describe('a tap', () => {
    const press = (type: string, pointerType: string, target: EventTarget): void => {
      const event = new Event(type, { bubbles: true, composed: true })
      Object.assign(event, { pointerType })
      target.dispatchEvent(event)
    }
    test('keeps the rail open once the finger lifts', async () => {
      const outline = await rail()
      press('pointerenter', 'touch', outline)
      press('pointerdown', 'touch', outline)
      press('pointerup', 'touch', outline)
      press('pointerleave', 'touch', outline)
      expect(hasState(outline, 'open')).toBe(false)
      outline.dispatchEvent(new Event('click', { bubbles: true, composed: true }))
      expect(hasState(outline, 'open')).toBe(true)
    })

    test('closes on a tap outside, on Escape, and on a tap on a link', async () => {
      const outline = await rail()
      const open = (): void => {
        press('pointerdown', 'touch', outline)
        outline.dispatchEvent(new Event('click', { bubbles: true, composed: true }))
        expect(hasState(outline, 'open')).toBe(true)
      }
      open()
      press('pointerdown', 'touch', document.body)
      expect(hasState(outline, 'open')).toBe(false)
      open()
      document.body.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' }))
      expect(hasState(outline, 'open')).toBe(false)
      open()
      const link = outline.querySelector('a') as HTMLAnchorElement
      press('pointerdown', 'touch', link)
      link.dispatchEvent(new Event('click', { bubbles: true, composed: true }))
      expect(hasState(outline, 'open')).toBe(false)
    })

    test('a tap inside leaves it open', async () => {
      const outline = await rail()
      press('pointerdown', 'touch', outline)
      outline.dispatchEvent(new Event('click', { bubbles: true, composed: true }))
      press('pointerdown', 'touch', outline)
      expect(hasState(outline, 'open')).toBe(true)
    })

    test('a mouse click does not hold the rail open', async () => {
      const outline = await rail()
      press('pointerdown', 'mouse', outline)
      outline.dispatchEvent(new Event('click', { bubbles: true, composed: true }))
      expect(hasState(outline, 'open')).toBe(false)
      fire(outline, 'pointerenter')
      fire(outline, 'pointerleave')
      expect(hasState(outline, 'open')).toBe(false)
    })
  })

  test('closes when the pointer leaves, unless focus is inside', async () => {
    const outline = await rail()
    fire(outline, 'pointerenter')
    fire(outline, 'pointerleave')
    expect(hasState(outline, 'open')).toBe(false)
    fire(outline, 'focusin', { bubbles: true })
    fire(outline, 'pointerenter')
    fire(outline, 'pointerleave')
    expect(hasState(outline, 'open')).toBe(true)
    fire(outline, 'focusout', { bubbles: true })
    expect(hasState(outline, 'open')).toBe(false)
  })

  test('draws no ticks and no surface without the marker, and never opens', async () => {
    const outline = await rail('')
    expect(outline.shadowRoot?.querySelector('[part="ticks"]')).toBeNull()
    expect(outline.shadowRoot?.querySelector('[part="surface"]')).toBeNull()
    fire(outline, 'pointerenter')
    expect(hasState(outline, 'open')).toBe(false)
  })
})

describe('outline rail marker', () => {
  test('reflects to the attribute', async () => {
    const outline = await rail('')
    ;(outline as unknown as { marker: string }).marker = 'rail'
    await outline.updateComplete
    expect(outline.getAttribute('marker')).toBe('rail')
    expect(outline.shadowRoot?.querySelector('[part="surface"]')).not.toBeNull()
  })
})
