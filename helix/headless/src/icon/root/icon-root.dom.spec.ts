import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

const svg = (host: HTMLElement): Element | null => part(host, 'svg')

/* A missing name is said once the page has settled, a frame after load,
   which happy-dom's document already is. */
const settled = (): Promise<void> =>
  new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(() => done())))

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
    expect(heard).toBe(0)
    await settled()
    icon.setAttribute('mirror', 'x')
    await icon.updateComplete
    await settled()
    expect(heard).toBe(1)
    icon.name = 'check'
    await icon.updateComplete
    expect(svg(icon)).not.toBeNull()
    expect(heard).toBe(1)
  })

  /* The `error` event reaches a listener that was bound; the warning reaches
     the developer who wrote the name, once per name. */
  test('and warns in the console, once for each name', async () => {
    const warnings: string[] = []
    const original = console.warn
    console.warn = (message: string) => warnings.push(message)
    try {
      const icon = (await mount(
        '<helix-headless-icon name="not-a-real-icon"></helix-headless-icon>',
      )) as HTMLElement & { updateComplete: Promise<unknown> }
      icon.setAttribute('mirror', '')
      await icon.updateComplete
      await settled()
    } finally {
      console.warn = original
    }
    expect(warnings.length).toBe(1)
    expect(warnings[0]).toContain('not-a-real-icon')
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

/* Web Awesome's `registerIconLibrary`: a page names glyphs it brought, and
   the element draws them when they are registered, even later. */
describe('a name the page registered', () => {
  type Icon = HTMLElement & { name: string; updateComplete: Promise<boolean> }
  const glyph = (name: string) => ({
    content: `<rect width="24" height="24" data-glyph-name="${name}"></rect>`,
    name,
    viewBox: '0 0 24 24',
  })
  const drawnName = (icon: HTMLElement): string | null | undefined =>
    svg(icon)?.querySelector('rect')?.getAttribute('data-glyph-name')

  test('draws a glyph registered after it rendered', async () => {
    const { registerIcons } = await import('../index.js')
    const icon = (await mount(
      '<helix-headless-icon name="spec-late"></helix-headless-icon>',
    )) as Icon
    expect(svg(icon)).toBeNull()
    registerIcons([glyph('spec-late')])
    await icon.updateComplete
    expect(drawnName(icon)).toBe('spec-late')
  })

  test('draws what a library gives later, and fires `load` once it is drawn', async () => {
    const { registerIconLibrary } = await import('../index.js')
    let answer: (value: ReturnType<typeof glyph>) => void = () => {}
    registerIconLibrary(
      'spec-remote',
      (name) =>
        new Promise((resolve) => {
          answer = () => resolve(glyph(name))
        }),
    )
    const icon = (await mount('<helix-headless-icon></helix-headless-icon>')) as Icon
    const heard: string[] = []
    icon.addEventListener('load', () => heard.push('load'))
    icon.addEventListener('error', () => heard.push('error'))
    icon.name = 'spec-remote:camera'
    await icon.updateComplete
    expect(svg(icon)).toBeNull()
    expect(heard).toEqual([])
    answer(glyph('camera'))
    await new Promise((resolve) => setTimeout(resolve, 0))
    await icon.updateComplete
    expect(drawnName(icon)).toBe('camera')
    icon.setAttribute('mirror', '')
    await icon.updateComplete
    expect(heard).toEqual(['load'])
  })

  /* A library a page registers after the element has rendered is not a
     missing glyph: the name waits for the page to settle before it is said
     to draw nothing. */
  test('says nothing of a name a library registered later still draws', async () => {
    const { registerIconLibrary } = await import('../index.js')
    const icon = (await mount('<helix-headless-icon></helix-headless-icon>')) as Icon
    let errors = 0
    icon.addEventListener('error', () => {
      errors += 1
    })
    icon.name = 'spec-late:camera'
    await icon.updateComplete
    registerIconLibrary('spec-late', (name) => glyph(name))
    await icon.updateComplete
    await settled()
    expect(errors).toBe(0)
    expect(drawnName(icon)).toBe('camera')
  })

  test('fires `error` when the library answers nothing', async () => {
    const { registerIconLibrary } = await import('../index.js')
    registerIconLibrary('spec-empty', () => Promise.resolve(undefined))
    const icon = (await mount('<helix-headless-icon></helix-headless-icon>')) as Icon
    let errors = 0
    icon.addEventListener('error', () => {
      errors += 1
    })
    const original = console.warn
    console.warn = () => {}
    try {
      icon.name = 'spec-empty:camera'
      await icon.updateComplete
      await new Promise((resolve) => setTimeout(resolve, 0))
      await icon.updateComplete
      await settled()
    } finally {
      console.warn = original
    }
    expect(svg(icon)).toBeNull()
    expect(errors).toBe(1)
  })
})

/* Web Awesome's libraries take a `mutator` that changes each drawn `<svg>`. */
describe('a library with a mutator', () => {
  test('hands each drawn glyph of the library to it', async () => {
    const { registerIconLibrary } = await import('../index.js')
    registerIconLibrary(
      'spec-thin',
      (name) => ({ content: '<path d="M0 0h1"></path>', name, viewBox: '0 0 24 24' }),
      { mutator: (drawn) => drawn.setAttribute('stroke-width', '1.5') },
    )
    const icon = await mount('<helix-headless-icon name="spec-thin:line"></helix-headless-icon>')
    const plain = await mount('<helix-headless-icon name="check"></helix-headless-icon>')
    expect([
      svg(icon)?.getAttribute('stroke-width'),
      svg(plain)?.hasAttribute('stroke-width'),
    ]).toEqual(['1.5', false])
  })
})

/* An unnamed icon that is all a button holds left a button with no name, and
   nothing said so. The warning is in development builds only: the package's
   `test:dom` passes `--conditions helix-development`. */
describe('a decorative icon alone in a control', () => {
  const warnedOn = async (markup: string): Promise<string[]> => {
    const warnings: string[] = []
    const original = console.warn
    console.warn = (message: string) => warnings.push(message)
    try {
      await mount(markup)
      await new Promise((done) => setTimeout(done, 5))
    } finally {
      console.warn = original
    }
    return warnings.filter((one) => one.includes('accessible name'))
  }

  test('warns that the control has no name', async () => {
    const warnings = await warnedOn(
      '<button><helix-headless-icon name="check"></helix-headless-icon></button>',
    )
    expect(warnings.length).toBe(1)
    expect(warnings[0]).toContain('<button>')
  })

  test('and says nothing where the icon or the control is named, or words name it', async () => {
    expect([
      ...(await warnedOn(
        '<button><helix-headless-icon name="check" label="Done"></helix-headless-icon></button>',
      )),
      ...(await warnedOn(
        '<button aria-label="Done"><helix-headless-icon name="check"></helix-headless-icon></button>',
      )),
      ...(await warnedOn(
        '<a href="#"><helix-headless-icon name="check"></helix-headless-icon> Done</a>',
      )),
    ]).toEqual([])
  })
})
