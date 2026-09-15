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
 * The preview's point, drawn through the part the copy button forwards, at the
 * top of the window.
 *
 * **The screenshot this was written from.** The bubble asks for `top`, has no
 * room above a button at the top of the frame, and flips below it. The sheet
 * pinned `::part(tooltip-arrow)` to the bubble's bottom edge, the only edge it
 * could name from outside two shadow roots, so the point hung off the far side
 * pointing away from the button. The sheet draws the shape and no edge now, and
 * the controller puts it on the edge facing the button.
 *
 * The rotation is read back as well as the position, so what is measured is the
 * forwarded part the document sheet drew, not an arrow nothing styled.
 */
describe('the preview’s point, flipped below the button', () => {
  afterEach(() => {
    document.documentElement.removeAttribute('dir')
  })

  for (const direction of ['ltr', 'rtl']) {
    run(
      `stands in the middle of the bubble’s top edge, under the button, ${direction}`,
      async () => {
        document.documentElement.dir = direction
        await example(preview, sheet)
        const host = document.querySelector('helix-headless-copy-button') as HTMLElement
        const tip = host.shadowRoot?.querySelector('helix-headless-tooltip') as Tip
        const button = part(host, 'button') as HTMLElement
        expect(button.getBoundingClientRect().top).toBeLessThan(24)
        tip.show()
        await idle()
        const bubble = part(tip, 'tooltip') as HTMLElement
        const arrow = part(tip, 'arrow') as HTMLElement
        expect(getComputedStyle(arrow).rotate).toBe('45deg')
        expect(bubble.getAttribute('data-placement')).toBe('bottom')
        expect(arrow.getAttribute('part')).toBe('arrow arrow-bottom')
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

  /* The side reaches a document sheet as a name, forwarded through two shadow
     roots, which is the only way a sheet out here can draw by it. */
  run('is named for the side it landed on, where a document sheet can select it', async () => {
    await example(preview, sheet)
    const side = document.createElement('style')
    side.textContent = `helix-headless-copy-button::part(tooltip-arrow-bottom) { outline: 1px solid rgb(1, 2, 3) }
      helix-headless-copy-button::part(tooltip-bottom) { outline: 1px solid rgb(4, 5, 6) }`
    document.body.append(side)
    const host = document.querySelector('helix-headless-copy-button') as HTMLElement
    const tip = host.shadowRoot?.querySelector('helix-headless-tooltip') as Tip
    tip.show()
    await idle()
    expect(getComputedStyle(part(tip, 'arrow') as Element).outlineColor).toBe('rgb(1, 2, 3)')
    expect(getComputedStyle(part(tip, 'tooltip') as Element).outlineColor).toBe('rgb(4, 5, 6)')
  })
})
