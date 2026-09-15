import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { example, hasLayout, idle, part, registerDom } from '@fusion.dev/helix-testing/dom'
import sheet from '../.examples/preview.css' with { type: 'text' }
import preview from '../.examples/preview.html' with { type: 'text' }

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Tip = HTMLElement & { show(): void }

/* Browser only: what is asserted is where the preview's own sheet puts things. */
const run = hasLayout() ? test : (): void => {}

/**
 * The copy button's point, three shadow roots down, at the top of the window.
 *
 * The preview draws it through `::part(copy-tooltip-arrow)`, which reaches the
 * tooltip inside the copy button inside the code block and could name no edge:
 * no attribute follows `::part()`, so the sheet pinned the bottom one for the
 * `top` the bubble asks for. A block at the top of a page flips its bubble
 * below the button, and the point hung off the far side. The sheet draws the
 * shape now and the controller puts it on the edge facing the button.
 */
describe('the copy button’s point, flipped below it', () => {
  afterEach(() => {
    document.documentElement.removeAttribute('dir')
    document.body.replaceChildren()
    window.scrollTo(0, 0)
  })

  for (const direction of ['ltr', 'rtl']) {
    run(
      `stands in the middle of the bubble’s top edge, under the button, ${direction}`,
      async () => {
        document.documentElement.dir = direction
        await example(preview, sheet)
        const block = document.querySelector('helix-headless-code-block') as HTMLElement
        const copy = part(block, 'copy') as HTMLElement
        const tip = copy.shadowRoot?.querySelector('helix-headless-tooltip') as Tip
        const button = part(copy, 'button') as HTMLElement
        /* Scrolled to the top of the window, as a reader leaves a block they
           are about to copy from. A page tall enough to scroll, so there is
           somewhere to scroll it to. */
        const room = document.createElement('div')
        room.style.blockSize = '200vh'
        document.body.append(room)
        button.scrollIntoView({ block: 'start' })
        tip.show()
        await idle()
        const bubble = part(tip, 'tooltip') as HTMLElement
        const arrow = part(tip, 'arrow') as HTMLElement
        expect(getComputedStyle(arrow).rotate).toBe('45deg')
        expect(bubble.getAttribute('data-placement')).toBe('bottom')
        const edge = bubble.getBoundingClientRect()
        const point = arrow.getBoundingClientRect()
        const anchor = button.getBoundingClientRect()
        expect(edge.top).toBeGreaterThanOrEqual(anchor.bottom)
        expect(Math.abs(point.top + point.height / 2 - edge.top)).toBeLessThanOrEqual(1)
        expect(
          Math.abs(point.left + point.width / 2 - (anchor.left + anchor.width / 2)),
        ).toBeLessThanOrEqual(1)
      },
    )
  }
})
