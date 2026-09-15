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
  })
}
