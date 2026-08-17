import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, part, registerDom } from '@fusion-io/testing/dom'

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

describe('page nav', () => {
  test('a link pointing at nothing is skipped rather than throwing', async () => {
    /* Fragments go stale: a heading is renamed and the contents page still
       points at the old id. Marking nothing is right; failing to render is
       not. */
    const nav = (await mount(
      `<helix-outline label="On this page"><a href="#gone">Gone</a></helix-outline>`,
    )) as Nav
    await nav.updateComplete
    expect(nav.querySelector('a')?.hasAttribute('aria-current')).toBe(false)
  })

  test('nothing is marked before anything has been measured', async () => {
    const nav = (await mount('<helix-outline></helix-outline>')) as Nav
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
        '<helix-outline label="On this page"><a href="#gone">Gone</a></helix-outline>',
      )) as Nav
      await bare.updateComplete
      expect((part(bare, 'indicator') as HTMLElement).hasAttribute('data-placed')).toBe(false)
    })
  })
}

describe('outline scrolling', () => {
  const page = async (attrs = '') => {
    const nav = (await mount(
      `<div><helix-outline ${attrs} label="On this page">` +
        '<a href="#one">One</a><a href="#two">Two</a>' +
        '</helix-outline>' +
        '<section id="one"><h2>One</h2></section><section id="two"><h2>Two</h2></section></div>',
    )) as HTMLElement
    const outline = nav.querySelector('helix-outline') as Nav
    await outline.updateComplete
    return { outline, root: nav }
  }

  const press = (root: HTMLElement, href: string) => {
    const event = new MouseEvent('click', { bubbles: true, button: 0, cancelable: true })
    root.querySelector<HTMLAnchorElement>(`a[href="${href}"]`)?.dispatchEvent(event)
    return event
  }

  test('offset reaches the sections, not only the marker', async () => {
    /* It described where the top of the readable area is and exactly one thing
       read it. Click a link and the browser put the heading against the very
       top of the window, under the masthead whose height the consumer had just
       measured for us. */
    const { outline, root } = await page('offset="64"')
    await outline.updateComplete
    expect((root.querySelector('#two') as HTMLElement).style.scrollMarginBlockStart).toBe('64px')
  })

  test('no offset leaves no style attribute behind', async () => {
    const { root } = await page()
    expect((root.querySelector('#two') as HTMLElement).style.scrollMarginBlockStart).toBe('')
  })

  test('the offset is cleared when it goes back to zero', async () => {
    const { outline, root } = await page('offset="64"')
    outline.offset = 0
    await outline.updateComplete
    expect((root.querySelector('#two') as HTMLElement).style.scrollMarginBlockStart).toBe('')
  })

  test('auto leaves the navigation to the browser', async () => {
    /* The whole point of the default: four things happen on a fragment click
       and the platform does all four. Taking the click to do one of them is
       what makes the other three this component's problem. */
    const { root } = await page()
    expect(press(root, '#two').defaultPrevented).toBe(false)
  })

  test('a chosen behavior takes the click, and puts focus where the anchor would have', async () => {
    const { root } = await page('behavior="smooth"')
    expect(press(root, '#two').defaultPrevented).toBe(true)
    const target = root.querySelector('#two') as HTMLElement
    expect(target.getAttribute('tabindex')).toBe('-1')
    expect(document.activeElement).toBe(target)
  })

  test('a modified click is left alone, being a new tab rather than a jump', async () => {
    const { root } = await page('behavior="smooth"')
    const event = new MouseEvent('click', {
      bubbles: true,
      button: 0,
      cancelable: true,
      metaKey: true,
    })
    root.querySelector<HTMLAnchorElement>('a[href="#two"]')?.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(false)
  })

  test('a link pointing at nothing is not taken over', async () => {
    const { root } = await page('behavior="smooth"')
    const stale = document.createElement('a')
    stale.setAttribute('href', '#gone')
    root.querySelector('helix-outline')?.append(stale)
    await (root.querySelector('helix-outline') as Nav).updateComplete
    const event = new MouseEvent('click', { bubbles: true, button: 0, cancelable: true })
    stale.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(false)
  })
})
