import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, part, registerDom, settled } from '@helix-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Section = HTMLElement & { open: boolean; updateComplete: Promise<boolean> }

const _section = async (label = 'Products'): Promise<Section> => {
  const host = (await mount(
    `<helix-megamenu label="${label}"><a href="/one">One</a></helix-megamenu>`,
  )) as Section
  await host.updateComplete
  return host
}

const trigger = (host: Section) => part(host, 'trigger') as HTMLElement

/* `PointerEvent` is not in every DOM this runs in, and a plain `Event` carries
   no `pointerType`, which is the whole thing under test. */
const pointer = (type: string, pointerType: string): Event => {
  const event = new Event(type, { bubbles: false, cancelable: true })
  Object.defineProperty(event, 'pointerType', { value: pointerType })
  return event
}

const press = (host: Section, pointerType: string, detail = 1): void => {
  if (pointerType !== 'none') {
    host.dispatchEvent(pointer('pointerdown', pointerType))
  }
  trigger(host).dispatchEvent(new MouseEvent('click', { bubbles: true, detail }))
}

const _settle = (ms: number): Promise<void> =>
  new Promise((done) => {
    setTimeout(done, ms)
  })

/* Where the panel lands and what shape it takes, which is this tier's: the
   card as wide as its columns, the band spanning the page and starting under
   the bar, the wrap when a column will not hold a sentence, and the exit that
   has to finish before the panel is gone. Opening, closing, hovering, the
   disclosure contract and the slotted trigger are behavior and are tested on
   the headless tier. */
if (hasLayout()) {
  describe('a megamenu panel that has been closed', () => {
    /* Asserting on `open` alone is what let this ship. The state was closing
       correctly on every path, and the band stayed painted over the page
       anyway, because a stylesheet gave a hidden panel a display. A box is the
       only thing that answers "did it close" from the reader's side. */
    const banded = async (variant: string): Promise<Section> => {
      const host = (await mount(
        `<helix-megamenu variant="${variant}" label="Products">
          <div data-megamenu-group><a href="#one">One</a></div>
        </helix-megamenu>`,
      )) as Section
      await host.updateComplete
      return host
    }

    const panelBox = (host: Section): DOMRect =>
      (part(host, 'panel') as HTMLElement).getBoundingClientRect()

    for (const variant of ['card', 'full']) {
      test(`takes no box when it is ${variant}`, async () => {
        const host = await banded(variant)
        press(host, 'none', 0)
        await host.updateComplete
        expect(panelBox(host).height).toBeGreaterThan(0)

        press(host, 'none', 0)
        await host.updateComplete
        /* The exit has to run before the box goes. `allow-discrete` holds the
           `display` change back so the transition has somewhere to happen, so
           measured on the update that closed it the panel is still 900 by 85
           with three transitions in flight. Waiting on the animations rather
           than on a duration, which would be a number kept beside a token. */
        await settled(part(host, 'panel'))
        expect(host.open).toBe(false)
        /* The band was 1280 by 267 here, and `open` was already false.
           `:host([variant="full"]) [part="surface"]` is (0,3,0) and the guard
           was a bare `[part="surface"][hidden]` at (0,2,0), so it lost. */
        expect(panelBox(host).height).toBe(0)
        expect(panelBox(host).width).toBe(0)
      })
    }
  })

  describe('a megamenu panel, once there is a page under it', () => {
    const opened = async (): Promise<HTMLElement> => {
      const bar = (await mount(
        `<nav style="padding:40px">
          <helix-megamenu label="Products">
            <div data-megamenu-group>
              <a data-megamenu-item href="/one"><strong>One</strong><span>First.</span></a>
            </div>
            <div data-megamenu-group>
              <a data-megamenu-item href="/two"><strong>Two</strong><span>Second.</span></a>
            </div>
          </helix-megamenu>
        </nav>`,
      )) as HTMLElement
      const host = bar.querySelector('helix-megamenu') as HTMLElement & {
        updateComplete: Promise<boolean>
      }
      await host.updateComplete
      ;(part(host, 'trigger') as HTMLElement).click()
      await host.updateComplete
      /* And a frame, because placing it is asynchronous: `computePosition`
         measures the anchor and resolves later, so a panel read on the same
         tick it opened is showing and still sitting where the top layer put it
         before anyone said where it goes. */
      await new Promise((done) => requestAnimationFrame(() => done(null)))
      return host
    }

    test('is in the top layer, so a header cannot clip it', async () => {
      /* A nav bar lives in a header, and a header is exactly the kind of
         ancestor that carries `overflow` or a `transform`: the first clips a
         positioned panel and the second re-anchors it entirely. `popover` is
         what escapes both, and nothing else does. */
      const host = await opened()
      const panel = part(host, 'panel') as HTMLElement
      expect(panel.matches(':popover-open')).toBe(true)
    })

    test('and hangs under the trigger rather than off the page', async () => {
      const host = await opened()
      const panel = (part(host, 'panel') as HTMLElement).getBoundingClientRect()
      const trigger = (part(host, 'trigger') as HTMLElement).getBoundingClientRect()
      expect(panel.width).toBeGreaterThan(0)
      expect(panel.top).toBeGreaterThanOrEqual(trigger.bottom - 1)
    })

    test('the card is as wide as its columns, not as wide as nothing', async () => {
      /* The panel is fixed and in the top layer, so nothing gives it a width and
         a `1fr` track in a box with no definite size resolves against nothing:
         without `max-content` a two-column panel came out 34 pixels wide with
         its rows overflowing it. Asserted here rather than by eye, because the
         browser pane a person looks through reports a zero viewport when it is
         hidden, which makes every `vw` in this stylesheet nought and the whole
         measurement a fiction. */
      const host = await opened()
      const panel = (part(host, 'panel') as HTMLElement).getBoundingClientRect()
      expect(panel.width).toBeGreaterThan(400)
      const rows = [...host.querySelectorAll('[data-megamenu-item]')]
      for (const row of rows) {
        expect(row.getBoundingClientRect().right).toBeLessThanOrEqual(panel.right + 1)
      }
    })

    test('and the band spans the page and starts under the bar, not the trigger', async () => {
      const bar = (await mount(
        `<nav style="padding:40px">
          <helix-megamenu variant="full" label="Products">
            <div data-megamenu-group>
              <a data-megamenu-item href="/one"><strong>One</strong><span>First.</span></a>
            </div>
          </helix-megamenu>
        </nav>`,
      )) as HTMLElement
      const host = bar.querySelector('helix-megamenu') as HTMLElement & {
        updateComplete: Promise<boolean>
      }
      await host.updateComplete
      ;(part(host, 'trigger') as HTMLElement).click()
      await host.updateComplete
      await new Promise((done) => requestAnimationFrame(() => done(null)))

      const panel = (part(host, 'panel') as HTMLElement).getBoundingClientRect()
      const trigger = (part(host, 'trigger') as HTMLElement).getBoundingClientRect()
      expect(Math.round(panel.left)).toBe(0)
      expect(Math.round(panel.width)).toBe(document.documentElement.clientWidth)

      /* The bar's bottom edge, not the trigger's. A bar is taller than the word
         in it, so a band starting at the word starts partway up the bar and is
         drawn across its own padding and its border: measured on a header,
         trigger bottom 44 against header bottom 57. The bar here is the `nav`,
         which is the first ancestor as wide as the window. */
      expect(Math.round(panel.top)).toBe(Math.round(bar.getBoundingClientRect().bottom))
      expect(Math.round(panel.top)).toBeGreaterThan(Math.round(trigger.bottom))
    })

    test('a plain link in a group starts where its heading does', async () => {
      /* The panel is inside the nav, so its anchors match the nav bar's own
         rule, which centres a word in a horizontal strip. Left unanswered, a
         column of plain links came out centered under a heading that was not. */
      const bar = (await mount(
        `<nav style="padding:40px">
          <helix-megamenu label="Products">
            <div data-megamenu-group>
              <h3 data-megamenu-heading>More</h3>
              <a data-navigation-item href="#docs">Documentation</a>
              <a data-navigation-item href="#status">A much longer destination</a>
            </div>
          </helix-megamenu>
        </nav>`,
      )) as HTMLElement
      const host = bar.querySelector('helix-megamenu') as HTMLElement & {
        updateComplete: Promise<boolean>
      }
      await host.updateComplete
      ;(part(host, 'trigger') as HTMLElement).click()
      await host.updateComplete

      /* The text, not the box. A flex column stretches its children, so each of
         these boxes spans the column whether its text is centered in it or not,
         and the box edge reads the same either way: the first version of this
         spec passed on the centered markup it was written to catch. A range over
         the contents measures where the words actually start. */
      const edge = (element: Element): number => {
        const range = document.createRange()
        range.selectNodeContents(element)
        return Math.round(range.getBoundingClientRect().left)
      }
      const heading = host.querySelector('[data-megamenu-heading]') as HTMLElement
      const links = [...host.querySelectorAll('[data-navigation-item]')] as HTMLElement[]
      expect(links.map(edge)).toEqual([edge(heading), edge(heading)])
      /* Differing lengths, so a shared edge cannot be two equal boxes centered. */
      expect(links[0].textContent).not.toBe(links[1].textContent)
    })

    test('a screen too narrow for columns gets the band, and they stack', async () => {
      /* Driven by `full-below` rather than by the viewport, because the runner
         gives every spec in a file the same window: a threshold above any
         plausible width is the same question asked in a way a spec can answer,
         and it is the property a consumer would move anyway. */
      const bar = (await mount(
        `<nav style="padding:40px">
          <helix-megamenu full-below="99999" label="Products">
            <div data-megamenu-group>
              <a data-megamenu-item href="/one"><strong>One</strong><span>First.</span></a>
            </div>
            <div data-megamenu-group>
              <a data-megamenu-item href="/two"><strong>Two</strong><span>Second.</span></a>
            </div>
            <div data-megamenu-group>
              <a data-megamenu-item href="/three"><strong>Three</strong><span>Third.</span></a>
            </div>
            <div data-megamenu-group>
              <a data-megamenu-item href="/four"><strong>Four</strong><span>Fourth.</span></a>
            </div>
          </helix-megamenu>
        </nav>`,
      )) as HTMLElement
      const host = bar.querySelector('helix-megamenu') as HTMLElement & {
        updateComplete: Promise<boolean>
      }
      await host.updateComplete
      expect(host.hasAttribute('data-narrow')).toBe(true)
      ;(part(host, 'trigger') as HTMLElement).click()
      await host.updateComplete
      await new Promise((done) => requestAnimationFrame(() => done(null)))

      const panel = (part(host, 'panel') as HTMLElement).getBoundingClientRect()
      expect(Math.round(panel.width)).toBe(document.documentElement.clientWidth)

      /* Stacked, which is one column: every group starts on the same edge, and
         four tracks of a fixed minimum laid across would not have fitted. */
      const groups = [...host.querySelectorAll('[data-megamenu-group]')]
      const edges = new Set(groups.map((g) => Math.round(g.getBoundingClientRect().left)))
      expect(edges.size).toBe(1)
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
        document.documentElement.clientWidth,
      )
    })

    test('and a threshold of zero leaves the card a card', async () => {
      const bar = (await mount(
        `<nav style="padding:40px">
          <helix-megamenu full-below="0" label="Products">
            <div data-megamenu-group>
              <a data-megamenu-item href="/one"><strong>One</strong><span>First.</span></a>
            </div>
          </helix-megamenu>
        </nav>`,
      )) as HTMLElement
      const host = bar.querySelector('helix-megamenu') as HTMLElement & {
        updateComplete: Promise<boolean>
      }
      await host.updateComplete
      expect(host.hasAttribute('data-narrow')).toBe(false)
      ;(part(host, 'trigger') as HTMLElement).click()
      await host.updateComplete
      const panel = (part(host, 'panel') as HTMLElement).getBoundingClientRect()
      expect(Math.round(panel.width)).toBeLessThan(document.documentElement.clientWidth)
    })

    test('a sentence too long for its column wraps inside it', async () => {
      /* The panel is in the nav, so these anchors match the nav bar's rule and
         arrived `nowrap`. A sentence that cannot wrap does not shrink either: it
         ran out of its column and out from under its own hover.
         The panel is held to 18rem, because a card is `max-content` and would
         otherwise answer a long sentence by getting wider, which is right and is
         not what is being asked here. */
      /* Inside a `helix-navigation`, which is the whole point: the rule that sets
         `nowrap` is `helix-navigation a`, so in a plain `<nav>` it never matches
         and the sentence wraps whatever this stylesheet says. The first version
         of this spec used a plain `<nav>` and passed with the fix reverted. */
      const bar = (await mount(
        `<helix-navigation label="Main" style="padding:40px">
          <helix-megamenu label="Products" style="--megamenu-size: 18rem">
            <div data-megamenu-group>
              <a data-megamenu-item href="/one"><strong>One</strong>
                <span>A description long enough that no column of this width could
                hold it on a single line, which is the point of the exercise.</span>
              </a>
            </div>
          </helix-megamenu>
        </helix-navigation>`,
      )) as HTMLElement
      const host = bar.querySelector('helix-megamenu') as HTMLElement & {
        updateComplete: Promise<boolean>
      }
      await host.updateComplete
      ;(part(host, 'trigger') as HTMLElement).click()
      await host.updateComplete

      const row = host.querySelector('[data-megamenu-item]') as HTMLElement
      const sentence = row.querySelector('span') as HTMLElement
      expect(sentence.getBoundingClientRect().right).toBeLessThanOrEqual(
        row.getBoundingClientRect().right + 1,
      )
      /* More than one line, or it was never asked to wrap in the first place.
         By height against the line height, not by counting client rects: the
         sentence is a grid item and so blockified, and a block returns one rect
         however many lines are inside it. The first version of this counted
         rects, got 1, and read it as "did not wrap" on a sentence that was
         sitting there in four lines. */
      const line = Number.parseFloat(getComputedStyle(sentence).lineHeight)
      expect(sentence.getBoundingClientRect().height).toBeGreaterThan(line * 1.5)
    })

    test('a heading sits off its rows by the same gap the rows sit off each other', async () => {
      /* One number gave three spacings. The gap was `2xs` between every child of
         a group, which sounds even until you notice a row carries its own
         padding and a heading does not: it came out as 12 between the heading
         and the first row, 20 between one row and the next, and 4 between a name
         and its sentence. Measured between the text, which is where the eye
         reads it, not between the boxes. */
      const bar = (await mount(
        `<helix-navigation label="Main" style="padding:40px">
          <helix-megamenu label="Products">
            <div data-megamenu-group>
              <h3 data-megamenu-heading>Design</h3>
              <a data-megamenu-item href="/one"><strong>One</strong><span>First.</span></a>
              <a data-megamenu-item href="/two"><strong>Two</strong><span>Second.</span></a>
            </div>
          </helix-megamenu>
        </helix-navigation>`,
      )) as HTMLElement
      const host = bar.querySelector('helix-megamenu') as HTMLElement & {
        updateComplete: Promise<boolean>
      }
      await host.updateComplete
      ;(part(host, 'trigger') as HTMLElement).click()
      await host.updateComplete
      const group = host.querySelector('[data-megamenu-group]') as HTMLElement
      const heading = group.querySelector('[data-megamenu-heading]') as HTMLElement
      const rows = [...group.querySelectorAll('[data-megamenu-item]')] as HTMLElement[]
      const top = (element: Element) => element.getBoundingClientRect().top
      const bottom = (element: Element) => element.getBoundingClientRect().bottom

      const headingToFirst = Math.round(
        top(rows[0].querySelector('strong') as Element) - bottom(heading),
      )
      const rowToRow = Math.round(
        top(rows[1].querySelector('strong') as Element) -
          bottom(rows[0].querySelector('span') as Element),
      )
      expect(headingToFirst).toBe(rowToRow)

      /* And a name and its sentence stay tighter than that, because they are one
         thing and a reader should see them as one. */
      const nameToSentence = Math.round(
        top(rows[0].querySelector('span') as Element) -
          bottom(rows[0].querySelector('strong') as Element),
      )
      expect(nameToSentence).toBeLessThan(rowToRow)
    })

    test('a band too narrow for its columns wraps them rather than overflowing', async () => {
      /* `grid-auto-flow: column` put every group on one row and kept it there:
         the tracks were as wide as the groups needed whatever the band was, so
         it did not reflow, it overflowed. Measured on four groups: 1120 pixels
         of columns at every viewport from 1400 down, so from 1100 the band ran
         over and by 780 two groups were past its edge, with the breakpoint that
         stacks it still 140 pixels away.

         Driven by the column width rather than the window, because the runner
         gives every spec the same viewport: a column too wide to fit four of is
         the same question asked in a way a spec can answer. */
      const bar = (await mount(
        `<helix-navigation label="Main" style="padding:0">
          <helix-megamenu variant="full" label="Products" style="--megamenu-column-size: 26rem">
            ${['One', 'Two', 'Three', 'Four']
              .map(
                (name) =>
                  `<div data-megamenu-group>
                     <h3 data-megamenu-heading>${name}</h3>
                     <a data-megamenu-item href="#${name}"><strong>${name}</strong><span>A thing.</span></a>
                   </div>`,
              )
              .join('')}
          </helix-megamenu>
        </helix-navigation>`,
      )) as HTMLElement
      const host = bar.querySelector('helix-megamenu') as HTMLElement & {
        updateComplete: Promise<boolean>
      }
      await host.updateComplete
      ;(part(host, 'trigger') as HTMLElement).click()
      await host.updateComplete
      await new Promise((done) => requestAnimationFrame(() => done(null)))

      const panel = part(host, 'panel') as HTMLElement
      expect(panel.scrollWidth).toBeLessThanOrEqual(Math.ceil(panel.getBoundingClientRect().width))

      /* On more than one row, and in the same tracks: a group left alone on a
         row must not grow to the width of the band, or the hover wash on one of
         its links is a bar the width of the window. */
      const groups = [...host.querySelectorAll('[data-megamenu-group]')] as HTMLElement[]
      const rows = new Set(groups.map((one) => Math.round(one.getBoundingClientRect().top)))
      expect(rows.size).toBeGreaterThan(1)
      const widths = new Set(groups.map((one) => Math.round(one.getBoundingClientRect().width)))
      expect(widths.size).toBe(1)
    })

    test('a band whose bar scrolls away goes with it', async () => {
      /* The band is fixed and its offset is measured once, when it opens, so a
         header that scrolls off leaves it pinned where the header used to be:
         open, mid-page, with nothing above it. Measured at a scroll of 300,
         header bottom -243 and the band still at 57. The card never had this,
         because the floating controller follows its anchor; turning that off for
         a band that has nothing to be placed against took the scroll handling
         with it. */
      const bar = (await mount(
        `<nav style="padding:20px">
          <helix-megamenu variant="full" label="Products">
            <div data-megamenu-group>
              <a data-megamenu-item href="#one"><strong>One</strong><span>First.</span></a>
            </div>
          </helix-megamenu>
        </nav>
        <div style="block-size:200vh"></div>`,
      )) as HTMLElement
      const host = (bar.querySelector('helix-megamenu') ??
        document.querySelector('helix-megamenu')) as HTMLElement & {
        open: boolean
        updateComplete: Promise<boolean>
      }
      await host.updateComplete
      ;(part(host, 'trigger') as HTMLElement).click()
      await host.updateComplete
      expect(host.open).toBe(true)

      try {
        window.scrollTo(0, 400)
        await new Promise((done) => setTimeout(done, 120))
        await host.updateComplete
        expect(host.open).toBe(false)
      } finally {
        /* Put the page back, or every layout spec after this one measures
           against a document that is scrolled. */
        window.scrollTo(0, 0)
      }
    })

    test('the host takes a box, so a nav can measure its marker against it', async () => {
      /* `Navigation` measures against every element assigned to its slot, and
         `display: contents` generates none: a section holding the current page
         would have had the marker measured against a zero rect. `Menu` is
         `display: contents` and is right to be, being a wrapper around somebody
         else's trigger rather than an item in the row. */
      const host = await opened()
      expect(host.getBoundingClientRect().width).toBeGreaterThan(0)
    })
  })
}
