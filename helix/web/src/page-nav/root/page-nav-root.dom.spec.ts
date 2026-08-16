import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, part, registerDom } from '@fusion-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Nav = HTMLElement & { current: string; offset: number; updateComplete: Promise<boolean> }

describe('page nav', () => {
  test('a link pointing at nothing is skipped rather than throwing', async () => {
    /* Fragments go stale: a heading is renamed and the contents page still
       points at the old id. Marking nothing is right; failing to render is
       not. */
    const nav = (await mount(
      `<helix-page-nav label="On this page"><a href="#gone">Gone</a></helix-page-nav>`,
    )) as Nav
    await nav.updateComplete
    expect(nav.querySelector('a')?.hasAttribute('aria-current')).toBe(false)
  })

  test('nothing is marked before anything has been measured', async () => {
    const nav = (await mount('<helix-page-nav></helix-page-nav>')) as Nav
    await nav.updateComplete
    expect(nav.current).toBe('')
  })
})

if (hasLayout()) {
  describe('page nav reading position', () => {
    /* The whole component is this rule, and only a browser has the boxes to
       apply it to. Sections are taller than the window on purpose, so scrolling
       genuinely moves one heading past the reading line while leaving the next
       one below it. */
    const build = async (): Promise<Nav> => {
      const nav = (await mount(
        `<helix-page-nav label="On this page">
          <a href="#one">One</a>
          <a href="#two">Two</a>
          <a href="#three">Three</a>
        </helix-page-nav>
        <div id="one" style="height: 800px">One</div>
        <div id="two" style="height: 800px">Two</div>
        <div id="three" style="height: 800px">Three</div>`,
      )) as Nav
      await nav.updateComplete
      return nav
    }

    const settle = async (): Promise<void> => {
      await new Promise((done) => setTimeout(done, 120))
    }

    const marked = (nav: Nav): string | null =>
      nav.querySelector('a[aria-current]')?.getAttribute('href') ?? null

    test('before any heading is reached, the first section is the one being read', async () => {
      const nav = await build()
      window.scrollTo(0, 0)
      await settle()
      expect(marked(nav)).toBe('#one')
      expect(nav.current).toBe('one')
    })

    test('scrolling past a heading makes its section the current one', async () => {
      const nav = await build()
      const two = document.getElementById('two') as HTMLElement
      window.scrollTo(0, two.offsetTop + 10)
      await settle()
      expect(marked(nav)).toBe('#two')
    })

    test('with two headings on screen, the upper one is the one being read', async () => {
      /* The case an `IntersectionObserver` alone cannot answer: both are
         visible and both are intersecting, and a reader is under the upper
         one. Scrolled just past the second heading, the third is still on
         screen below it. */
      const nav = await build()
      const two = document.getElementById('two') as HTMLElement
      window.scrollTo(0, two.offsetTop + 20)
      await settle()
      expect(marked(nav)).toBe('#two')
    })

    test('exactly one link is ever marked', async () => {
      const nav = await build()
      const three = document.getElementById('three') as HTMLElement
      window.scrollTo(0, three.offsetTop + 10)
      await settle()
      expect(nav.querySelectorAll('a[aria-current]')).toHaveLength(1)
      expect(marked(nav)).toBe('#three')
    })

    test('moving the reading line re-marks without the page having moved', async () => {
      /* Nothing else would notice. The observer fires on sections crossing the
         viewport, and changing `offset` changes what crossing means rather than
         whether anything did, so without this the marker stays wrong until the
         reader happens to scroll. */
      const nav = await build()
      const two = document.getElementById('two') as HTMLElement
      window.scrollTo(0, two.offsetTop - 100)
      await settle()
      expect(marked(nav)).toBe('#one')

      nav.offset = 200
      await nav.updateComplete
      expect(marked(nav)).toBe('#two')
    })

    test('the reading line moves down with offset, which is what chrome needs', async () => {
      /* The direction is worth stating, because it reads backwards at first and
         this spec asserted the opposite before it was run. `offset` is where the
         top of the *readable* area is, so a larger one means a heading counts as
         reached while it is still further down the window. That is exactly what
         a sticky masthead wants: a heading sliding under 64px of chrome has
         arrived, and waiting for it to reach y=0 leaves the previous section
         marked while its own heading is out of sight.

         Scrolled so the second heading sits 100px down: with no offset the
         reader is still in the first section, and with 200px of chrome above
         them they are already in the second. */
      const two = document.getElementById('two') as HTMLElement

      const plain = await build()
      window.scrollTo(0, two.offsetTop - 100)
      await settle()
      expect(marked(plain)).toBe('#one')

      const inset = await build()
      inset.offset = 200
      await inset.updateComplete
      window.scrollTo(0, (document.getElementById('two') as HTMLElement).offsetTop - 100)
      await settle()
      expect(marked(inset)).toBe('#two')
    })

    test('the mark travels to the section being read, and is sized to it', async () => {
      /* A border on each link can only appear and disappear. This is one
         element that moves, so it has to be measured, and a measurement is
         something only a browser has. `check:selectors` cannot catch an
         indicator that renders and never places: the selector matches, the
         element is there, and it sits at the top of the list forever. */
      const nav = await build()
      const mark = part(nav, 'indicator') as HTMLElement
      const two = document.getElementById('two') as HTMLElement

      window.scrollTo(0, 0)
      await settle()
      expect(mark.hasAttribute('data-placed')).toBe(true)
      const first = mark.style.getPropertyValue('--_indicator-y')

      window.scrollTo(0, two.offsetTop + 20)
      await settle()
      expect(marked(nav)).toBe('#two')
      expect(mark.style.getPropertyValue('--_indicator-y')).not.toBe(first)
      expect(Number.parseFloat(mark.style.getPropertyValue('--_indicator-h'))).toBeGreaterThan(0)
    })

    test('the mark is hidden until it has been measured', async () => {
      // Or it slides down from the top of the list on first paint, which reads
      // as the component correcting itself rather than as it arriving.
      const bare = (await mount(
        '<helix-page-nav label="On this page"><a href="#gone">Gone</a></helix-page-nav>',
      )) as Nav
      await bare.updateComplete
      expect((part(bare, 'indicator') as HTMLElement).hasAttribute('data-placed')).toBe(false)
    })
  })
}
