import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { at, hasLayout, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

/* Where the track comes to rest when it moves on, in both writing directions.

   Here rather than beside the headless element, because showing two at once is
   a width this tier's stylesheet gives each slide: with none, every slide is
   the track's width and the arithmetic that failed is never asked.

   The fault is a right-to-left page's alone. `scrollLeft` counts down from zero
   there, and each slide's leading edge was read from the left, which put the
   first few at offsets the scroller could not reach: it clamped to zero, and
   the next arrow moved the dots while the slides stayed where they were. */
if (hasLayout()) {
  describe('a carousel showing two at once, moving on', () => {
    afterEach(() => {
      document.documentElement.removeAttribute('dir')
    })

    const rest = (track: HTMLElement): Promise<void> =>
      new Promise((resolve) => {
        track.addEventListener('scrollend', () => resolve(), { once: true })
        setTimeout(resolve, 1200)
      })

    for (const dir of ['ltr', 'rtl'] as const) {
      test(`puts the second slide at the leading edge, ${dir}`, async () => {
        document.documentElement.dir = dir
        const host = (await mount(`<helix-carousel label="Shots" per-view="2">
          <div>One</div><div>Two</div><div>Three</div><div>Four</div>
        </helix-carousel>`)) as HTMLElement & { index: number; updateComplete: Promise<unknown> }
        await host.updateComplete
        const track = part(host, 'track') as HTMLElement
        const settled = rest(track)
        ;(part(host, 'next') as HTMLElement).click()
        await settled
        const box = track.getBoundingClientRect()
        const second = at(host.children, 1).getBoundingClientRect()
        const lead = dir === 'rtl' ? box.right - second.right : second.left - box.left
        expect(host.index).toBe(1)
        expect(Math.round(lead)).toBe(
          Math.round(Number.parseFloat(getComputedStyle(track).paddingLeft)),
        )
      })
    }

    /* Three across 692 pixels is a pane of 209.33, and the last place the
       track rests at 450.66 along. Chromium took a left-to-right track to 451
       and stopped a right-to-left one at -450, so two thirds of a pixel of the
       slide before the first in view stayed on screen at the leading edge. */
    for (const dir of ['ltr', 'rtl'] as const) {
      test(`shows none of the slide before at its last place, ${dir}`, async () => {
        document.documentElement.dir = dir
        const host =
          (await mount(`<helix-carousel label="Shelf" per-view="3" style="inline-size: 692px">
          <div>One</div><div>Two</div><div>Three</div><div>Four</div><div>Five</div>
        </helix-carousel>`)) as HTMLElement & { index: number; updateComplete: Promise<unknown> }
        await host.updateComplete
        const track = part(host, 'track') as HTMLElement
        for (let press = 0; press < 2; press++) {
          const settled = rest(track)
          ;(part(host, 'next') as HTMLElement).click()
          await settled
        }
        const box = track.getBoundingClientRect()
        const before = at(host.children, 1).getBoundingClientRect()
        expect(host.index).toBe(2)
        if (dir === 'rtl') {
          expect(before.left).toBeGreaterThanOrEqual(box.right)
        } else {
          expect(before.right).toBeLessThanOrEqual(box.left)
        }
      })
    }

    /* Panes rounded up to whole pixels kept every resting place whole and
       handed what they gained to the bleed after the last one in view: 14
       pixels of it, against 16 before the first. */
    for (const dir of ['ltr', 'rtl'] as const) {
      test(`keeps every gap and both bleeds equal three across, ${dir}`, async () => {
        document.documentElement.dir = dir
        const host =
          (await mount(`<helix-carousel label="Shelf" per-view="3" style="inline-size: 692px">
          <div>One</div><div>Two</div><div>Three</div><div>Four</div><div>Five</div>
        </helix-carousel>`)) as HTMLElement & { updateComplete: Promise<unknown> }
        await host.updateComplete
        const track = part(host, 'track') as HTMLElement
        const style = getComputedStyle(track)
        const box = track.getBoundingClientRect()
        const slides = [0, 1, 2].map((index) => at(host.children, index).getBoundingClientRect())
        const [left, middle, right] = (dir === 'rtl' ? [...slides].reverse() : slides) as [
          DOMRect,
          DOMRect,
          DOMRect,
        ]
        expect(left.left - box.left).toBeCloseTo(Number.parseFloat(style.paddingLeft), 1)
        expect(middle.left - left.right).toBeCloseTo(Number.parseFloat(style.columnGap), 1)
        expect(right.left - middle.right).toBeCloseTo(Number.parseFloat(style.columnGap), 1)
        expect(box.right - right.right).toBeCloseTo(Number.parseFloat(style.paddingRight), 1)
      })
    }
  })

  /* The width the sheet gives a pane at a count nobody wrote a rule for.

     This tier enumerated `per-view` two through five and called five the last
     step. Above it the share fell back to one across while the tier below went
     on counting positions, so eight slides six across drew three dots over a
     pane taking the whole track and five slides reachable only by dragging.
     Six and eight are the two sides of that edge: one just past the old
     ceiling, one where the track holds everything it has and there is nowhere
     left to scroll. */
  describe('a carousel showing more across than the sheet ever enumerated', () => {
    const shelf = async (across: number): Promise<HTMLElement> => {
      const host = (await mount(
        `<helix-carousel label="Shelf" per-view="${across}" style="inline-size: 692px">
          <div>One</div><div>Two</div><div>Three</div><div>Four</div>
          <div>Five</div><div>Six</div><div>Seven</div><div>Eight</div>
        </helix-carousel>`,
      )) as HTMLElement & { updateComplete: Promise<unknown> }
      await host.updateComplete
      return host
    }

    for (const across of [6, 7, 8]) {
      test(`lays a pane out at a ${across}th of the track`, async () => {
        const host = await shelf(across)
        const track = part(host, 'track') as HTMLElement
        const style = getComputedStyle(track)
        const room =
          track.clientWidth -
          Number.parseFloat(style.paddingLeft) -
          Number.parseFloat(style.paddingRight)
        const gap = Number.parseFloat(style.columnGap)
        const pane = at(host.children, 0).getBoundingClientRect().width
        expect(pane).toBeCloseTo((room - (across - 1) * gap) / across, 0)
      })
    }

    test('and the dots still count the positions that leaves', async () => {
      const host = await shelf(6)
      expect(part(host, 'indicators')?.querySelectorAll('[part~="indicator"]')).toHaveLength(3)
    })

    test('showing everything it has leaves nowhere to scroll', async () => {
      const host = await shelf(8)
      const track = part(host, 'track') as HTMLElement
      expect(track.scrollWidth - track.clientWidth).toBeLessThanOrEqual(1)
    })
  })
}
