import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, part, registerDom } from '@helix-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Nav = HTMLElement & {
  behavior: ScrollBehavior
  current: string
  offset: number
  updateComplete: Promise<boolean>
}

/* Where the reading mark sits and how tall it is, which the stylesheet decides:
   on the base tier every section measures the same 1px and the assertion has
   nothing to tell apart. The sections it tracks, and the scrolling, are
   behaviour and stay on the base. */
if (hasLayout()) {
  describe('page nav reading position', () => {
    /* The whole component is this rule, and only a browser has the boxes to
       apply it to. Sections are taller than the window on purpose, so scrolling
       genuinely moves one heading past the reading line while leaving the next
       one below it. */
    const build = async (): Promise<Nav> => {
      const nav = (await mount(
        `<helix-outline label="On this page">
          <a href="#one">One</a>
          <a href="#two">Two</a>
          <a href="#three">Three</a>
        </helix-outline>
        <div id="one" style="height: 800px">One</div>
        <div id="two" style="height: 800px">Two</div>
        <div id="three" style="height: 800px">Three</div>`,
      )) as Nav
      await nav.updateComplete
      return nav
    }

    /* Frames, not a duration. The component coalesces scroll measurements onto
       `requestAnimationFrame`, so what has to elapse is a frame and not a number
       of milliseconds: 120 of them is a guess that holds until a machine is busy
       and the browser run is exactly where one is. Two, because the listener
       schedules on the first and the measurement lands on the next, with a
       macrotask after them for the render the measurement asks for. */
    const settle = async (): Promise<void> => {
      await new Promise((done) => requestAnimationFrame(() => done(null)))
      await new Promise((done) => requestAnimationFrame(() => done(null)))
      await new Promise((done) => setTimeout(done, 0))
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
      const first = mark.style.getPropertyValue('--indicator-y')

      window.scrollTo(0, two.offsetTop + 20)
      await settle()
      expect(marked(nav)).toBe('#two')
      expect(mark.style.getPropertyValue('--indicator-y')).not.toBe(first)
      expect(Number.parseFloat(mark.style.getPropertyValue('--indicator-height'))).toBeGreaterThan(
        0,
      )
    })

    test('the end of the page marks the last section, reachable or not', async () => {
      /* The positional rule's one blind spot: a section near the end may not
         have enough page beneath it for its top to reach the reading line, so
         the last item in a contents list was unreachable by scrolling. */
      const nav = (await mount(
        `<div>
          <helix-outline label="On this page">
            <a href="#a">A</a><a href="#b">B</a><a href="#c">C</a>
          </helix-outline>
          <section id="a" style="min-block-size:120vh"><h2>A</h2></section>
          <section id="b" style="min-block-size:120vh"><h2>B</h2></section>
          <section id="c" style="min-block-size:40px"><h2>C</h2></section>
        </div>`,
      )) as HTMLElement
      const outline = nav.querySelector('helix-outline') as Nav
      await outline.updateComplete

      /* To the bottom, which is where the rule under test only fires.
         `scrollingElement`, not `window`: this library's own base layer makes
         the body a scroll container, so `window.scrollY` is not what moves. */
      const scroller = document.scrollingElement as HTMLElement
      scroller.scrollTop = scroller.scrollHeight
      await settle()
      expect(outline.current).toBe('c')
    })

    test('the mark is hidden until it has been measured', async () => {
      // Or it slides down from the top of the list on first paint, which reads
      // as the component correcting itself rather than as it arriving.
      const bare = (await mount(
        '<helix-outline label="On this page"><a href="#gone">Gone</a></helix-outline>',
      )) as Nav
      await bare.updateComplete
      expect((part(bare, 'indicator') as HTMLElement).hasAttribute('data-placed')).toBe(false)
    })
  })
}
