import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { at, example, hasLayout, part, registerDom } from '@fusion.dev/helix-testing/dom'
import sheet from '../.examples/several-across.css' with { type: 'text' }
import severalAcross from '../.examples/several-across.html' with { type: 'text' }

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../card/index.js')
})

type Reel = HTMLElement & { index: number; updateComplete: Promise<unknown> }

/* Where a consumer's own several-across sheet comes to rest, which is the
   headless half of `carousel-direction.dom.spec.ts` one tier up.

   **The correction is the component's, and this is the tier that proves it.**
   A sheet reaching the panes through `::part()` can neither count them nor
   select the last of them, so the arithmetic that ends the run on a whole pixel
   cannot be written out here at all. Measured in Chromium against a sheet that
   corrects its own run: three across, that one rested on one number both ways
   and an uncorrected track rested at 451 against -450.

   692 is the width the fault was measured at. Three across makes the pane
   209.33 and the run 450.66 longer than the track, and the width belongs to the
   spec rather than to the example, which is a shelf of cards at whatever width
   the page gives it.

   Browser only. This is layout, and happy-dom resolves nothing out of a sheet
   and reports no scroll position to read. */
if (hasLayout()) {
  describe('a headless carousel three across, at its last place', () => {
    afterEach(() => {
      document.documentElement.removeAttribute('dir')
    })

    const width = 'helix-headless-carousel { inline-size: 692px }'

    const rest = (track: HTMLElement): Promise<void> =>
      new Promise((resolve) => {
        track.addEventListener('scrollend', () => resolve(), { once: true })
        setTimeout(resolve, 1200)
      })

    /** The example run to the last of its three places, in one direction. */
    const ran = async (dir: 'ltr' | 'rtl'): Promise<Reel> => {
      document.documentElement.dir = dir
      await example(severalAcross, `${sheet}\n${width}`)
      const host = document.querySelector('helix-headless-carousel') as Reel
      const track = part(host, 'track') as HTMLElement
      const settled = rest(track)
      host.index = 2
      await host.updateComplete
      await settled
      return host
    }

    test('rests at the exact mirror of the other direction', async () => {
      const stops: number[] = []
      for (const dir of ['ltr', 'rtl'] as const) {
        stops.push((part(await ran(dir), 'track') as HTMLElement).scrollLeft)
      }
      const [along, back] = stops as [number, number]
      expect(Math.abs(along)).toBe(Math.abs(back))
      expect(along).toBeGreaterThan(0)
      expect(back).toBeLessThan(0)
    })

    for (const dir of ['ltr', 'rtl'] as const) {
      test(`shows none of the slide before it there, ${dir}`, async () => {
        // Two thirds of a pixel of the second card stayed at the leading edge.
        const host = await ran(dir)
        const box = (part(host, 'track') as HTMLElement).getBoundingClientRect()
        const before = at(host.children, 1).getBoundingClientRect()
        if (dir === 'rtl') {
          expect(before.left).toBeGreaterThanOrEqual(box.right)
        } else {
          expect(before.right).toBeLessThanOrEqual(box.left)
        }
      })
    }

    for (const dir of ['ltr', 'rtl'] as const) {
      test(`keeps every gap the gap, ${dir}`, async () => {
        /* The correction is a margin past the last pane, so it may not show up
           between two of them: a gap that grew by a third of a pixel is the
           other way of ending the run whole and is not this one. */
        const host = await ran(dir)
        const track = part(host, 'track') as HTMLElement
        const gap = Number.parseFloat(getComputedStyle(track).columnGap)
        const boxes = [...host.children].map((slide) => slide.getBoundingClientRect())
        const along = dir === 'rtl' ? [...boxes].reverse() : boxes
        for (let pane = 1; pane < along.length; pane += 1) {
          expect(at(along, pane).left - at(along, pane - 1).right).toBeCloseTo(gap, 1)
        }
      })
    }
  })
}
