import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

const svg = (host: HTMLElement): Element | null => part(host, 'svg')

describe('icon rendering', () => {
  test('draws the named glyph from the set', async () => {
    // The markup is the icon's own, several elements at once rather than one
    // path, which is why the data is inner content instead of a `d` string.
    const icon = await mount('<helix-headless-icon name="check"></helix-headless-icon>')
    expect(svg(icon)).not.toBeNull()
    expect(svg(icon)?.getAttribute('viewBox')).toBe('0 0 256 256')
    expect(svg(icon)?.querySelector('polyline, path, circle, line')).not.toBeNull()
  })

  test('an unknown name renders nothing rather than an empty box', async () => {
    // A typo that left a sized blank would look like a deliberate gap.
    const icon = await mount('<helix-headless-icon name="not-a-real-icon"></helix-headless-icon>')
    expect(svg(icon)).toBeNull()
  })

  /* A typo drew nothing and said nothing, while the styled host kept its
     box: a blank gap with no clue why. */
  test('and says so, once for each name it cannot find', async () => {
    const icon = (await mount(
      '<helix-headless-icon name="check"></helix-headless-icon>',
    )) as HTMLElement & { name: string; updateComplete: Promise<unknown> }
    let heard = 0
    icon.addEventListener('error', () => {
      heard += 1
    })
    icon.name = 'not-a-real-icon'
    await icon.updateComplete
    icon.setAttribute('mirror', '')
    await icon.updateComplete
    expect(heard).toBe(1)
    icon.name = 'check'
    await icon.updateComplete
    expect(svg(icon)).not.toBeNull()
    expect(heard).toBe(1)
  })

  /* `label` was the only way in, so an `aria-label` written on the element,
     the way a page names anything, left a generic element and a hidden glyph. */
  test('an `aria-label` on the element makes it an image with that name', async () => {
    const icon = (await mount(
      '<helix-headless-icon name="x" aria-label="Delete"></helix-headless-icon>',
    )) as HTMLElement & { internals?: ElementInternals; updateComplete: Promise<unknown> }
    expect(icon.internals?.role).toBe('img')
    icon.removeAttribute('aria-label')
    await icon.updateComplete
    expect(icon.internals?.role ?? null).toBeNull()
  })

  test('is decoration by default, and hidden from assistive technology', async () => {
    const icon = await mount('<helix-headless-icon name="x"></helix-headless-icon>')
    expect(svg(icon)?.getAttribute('aria-hidden')).toBe('true')
    expect(svg(icon)?.hasAttribute('role')).toBe(false)
  })

  test('a labeled icon becomes content with a name', async () => {
    const icon = await mount('<helix-headless-icon name="x" label="Dismiss"></helix-headless-icon>')
    expect(svg(icon)?.getAttribute('role')).toBe('img')
    expect(svg(icon)?.getAttribute('aria-label')).toBe('Dismiss')
    expect(svg(icon)?.hasAttribute('aria-hidden')).toBe(false)
  })

  test('takes its color from the text around it', async () => {
    // On the wrapping svg, which is where it has to be. The regular weight of
    // `@phosphor-icons/core` is one filled path with no paint of its own, so
    // the `fill` on the element the component renders around it is the only
    // thing painting the glyph. Asserting `currentColor` inside the glyph's own
    // markup instead tests the technique rather than the behavior.
    const icon = await mount('<helix-headless-icon name="check"></helix-headless-icon>')
    expect(svg(icon)?.getAttribute('fill')).toBe('currentColor')
    // And nothing inside overrides it with a color of its own, which is the
    // way an icon stops following its text.
    expect(svg(icon)?.innerHTML).not.toMatch(/(?:fill|stroke)="(?!none|currentColor)/)
  })
})

/* An arrow a consumer places means forward or back only to them, so it turns
   round on a right-to-left page when asked and not otherwise: the names are
   physical, and `arrow-left` pointing right unasked would disagree with its own
   name. */
describe('an icon that points along the line', () => {
  afterEach(() => {
    document.documentElement.removeAttribute('dir')
  })

  test('carries the mark `core` turns, when asked, and not otherwise', async () => {
    const asked = await mount(
      '<helix-headless-icon mirror name="arrow-right"></helix-headless-icon>',
    )
    expect(svg(asked)?.hasAttribute('data-mirror')).toBe(true)
    const plain = await mount('<helix-headless-icon name="arrow-right"></helix-headless-icon>')
    expect(svg(plain)?.hasAttribute('data-mirror')).toBe(false)
  })

  /* A browser's, because the turn is a `:dir()` rule and happy-dom matches none. */
  const browser = hasLayout() ? test : (): void => {}

  browser('turns on a right-to-left page, and only there', async () => {
    const scale = async (markup: string): Promise<string> =>
      getComputedStyle(svg(await mount(markup)) as Element).scale
    const asked = '<helix-headless-icon mirror name="arrow-right"></helix-headless-icon>'
    const plain = '<helix-headless-icon name="arrow-right"></helix-headless-icon>'
    expect(await scale(asked)).toBe('none')
    document.documentElement.dir = 'rtl'
    expect(await scale(asked)).toBe('-1 1')
    expect(await scale(plain)).toBe('none')
  })
})

/**
 * The value door, which is what a consumer importing an icon uses.
 *
 * **The point of it is what is not here.** A value ships one glyph and the set
 * it came from is the consumer's, so these assert that the element draws what it
 * was handed rather than anything it knows about.
 */
describe('an icon handed over as data', () => {
  const drawn = {
    content: '<circle cx="12" cy="12" r="10" fill="currentColor"></circle>',
    name: 'acme-dot',
    viewBox: '0 0 24 24',
  }

  test('draws a glyph the set has never heard of', async () => {
    const icon = (await mount('<helix-headless-icon></helix-headless-icon>')) as HTMLElement & {
      icon?: typeof drawn
      updateComplete: Promise<boolean>
    }
    icon.icon = drawn
    await icon.updateComplete
    expect(svg(icon)?.getAttribute('viewBox')).toBe('0 0 24 24')
    expect(svg(icon)?.querySelector('circle')).not.toBeNull()
  })

  test('the value wins over a name, being the more specific statement', async () => {
    const icon = (await mount(
      '<helix-headless-icon name="check"></helix-headless-icon>',
    )) as HTMLElement & { icon?: typeof drawn; updateComplete: Promise<boolean> }
    icon.icon = drawn
    await icon.updateComplete
    expect(svg(icon)?.getAttribute('viewBox')).toBe('0 0 24 24')
  })

  test('is decoration and takes a label the same way a named one does', async () => {
    const icon = (await mount(
      '<helix-headless-icon label="Status"></helix-headless-icon>',
    )) as HTMLElement & { icon?: typeof drawn; updateComplete: Promise<boolean> }
    icon.icon = drawn
    await icon.updateComplete
    expect(svg(icon)?.getAttribute('role')).toBe('img')
    expect(svg(icon)?.getAttribute('aria-label')).toBe('Status')
  })
})
