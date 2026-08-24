import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, part, registerDom } from '@helix-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Progress = HTMLElement & {
  fraction: number
  internals?: ElementInternals
  max: number
  updateComplete: Promise<boolean>
  value: number
  valueText: string
}

/* The browser harness implements a small `expect`, and the approximate matcher
   is not in it: written that way these pass under bun and fail in the one
   runner that can actually measure a box. A tolerance said out loud is clearer
   anyway, because what counts as close is a fact about the thing measured. */
const within = (actual: number, expected: number, tolerance: number): boolean =>
  Math.abs(actual - expected) <= tolerance

const progress = async (attrs = 'value="62"'): Promise<Progress> =>
  (await mount(`<helix-progress label="Uploading" ${attrs}></helix-progress>`)) as Progress

/* The fill and the indeterminate segment as drawn, including what reduced motion trades them for.

   The behavior is the base element's and is tested there. */
if (hasLayout()) {
  describe('progress geometry', () => {
    test('the fill is a proportion of the track it is drawn in', async () => {
      /* Measured rather than read back from the property, because the fraction
         reaches the page as a `scale` and a transform that failed to apply
         leaves the element at its full width with the number still correct. */
      const bar = await progress('value="25"')
      const track = part(bar, 'track') as HTMLElement
      const fill = part(bar, 'indicator') as HTMLElement

      const width = track.getBoundingClientRect().width
      expect(width).toBeGreaterThan(0)
      expect(within(fill.getBoundingClientRect().width, width * 0.25, 1)).toBe(true)
    })

    test('it grows from the inline start, not the middle', async () => {
      const bar = await progress('value="25"')
      const track = part(bar, 'track') as HTMLElement
      const fill = part(bar, 'indicator') as HTMLElement
      const edge = track.getBoundingClientRect().left
      expect(within(fill.getBoundingClientRect().left, edge, 1)).toBe(true)
    })
  })

  describe('indeterminate', () => {
    test('it is the same fill the determinate bar draws, not a different one', async () => {
      /* An indeterminate bar is this component in another state, not another
         component. Same color, same solid fill; what differs is that it never
         stops. */
      /* Both in one mount. `mount` assigns `document.body.innerHTML`, so
         mounting the second detaches the first and `getComputedStyle` on a
         detached element returns empty strings for everything. */
      const board = (await mount(
        `<div>
           <helix-progress id="running" indeterminate label="R"></helix-progress>
           <helix-progress id="settled" value="40" label="S"></helix-progress>
         </div>`,
      )) as HTMLElement
      const fill = (id: string): HTMLElement =>
        part(board.querySelector(`#${id}`) as HTMLElement, 'indicator') as HTMLElement
      const running = fill('running')
      const settled = fill('settled')
      expect(getComputedStyle(running).backgroundColor).toBe(
        getComputedStyle(settled).backgroundColor,
      )
      expect(getComputedStyle(running).backgroundImage).toBe('none')
      expect(getComputedStyle(running).animationName).toBe('helix-progress-indeterminate')
    })

    test('the segment never reaches the end of the track', async () => {
      /* A fill that arrives reads as finished, which is the one thing this
         state must never say. The keyframes stop it at six tenths. */
      const bar = await progress('indeterminate')
      const track = (part(bar, 'track') as HTMLElement).getBoundingClientRect()
      const fill = part(bar, 'indicator') as HTMLElement
      let widest = 0
      for (let sample = 0; sample < 12; sample += 1) {
        widest = Math.max(widest, fill.getBoundingClientRect().width)
        await new Promise((done) => setTimeout(done, 120))
      }
      expect(widest).toBeGreaterThan(0)
      expect(widest).toBeLessThan(track.width * 0.85)
    })

    test('reduced motion trades the segment for a hatch, which is not a quantity', async () => {
      /* The one place the two states cannot look alike. A traveling segment
         that has been stopped is parked somewhere along the track, which is
         exactly what a value looks like, and a bar that cannot move cannot
         correct the impression.
       *
       * The component has to say this itself. The base layer's rule is `*,
       * *::before, *::after` in the document, and `*` does not cross a shadow
       * boundary, so it reaches no part of any component here. Measured: under
       * `reduce`, a light-DOM element came back at 1e-05s and this one at its
       * full authored duration until this rule was added. */
      const fill = part(await progress('indeterminate'), 'indicator') as HTMLElement
      const style = getComputedStyle(fill)
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        expect(style.animationName).toBe('none')
        expect(style.backgroundImage).not.toBe('none')
        expect(style.scale).toBe('1')
      } else {
        expect(style.animationName).toBe('helix-progress-indeterminate')
        expect(style.backgroundImage).toBe('none')
      }
    })
  })
}
