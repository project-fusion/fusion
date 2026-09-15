import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, part, registerDom, settled } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Tip = HTMLElement & { show(): void; updateComplete: Promise<boolean> }

interface Pointed {
  arrow: DOMRect
  bubble: DOMRect
  side: string | null
  trigger: DOMRect
}

/**
 * Which way the point faces, in both writing directions.
 *
 * **The direction goes on the root**, because the bubble is in the top layer and
 * laid out against the viewport, whose direction is the root's; a wrapper with
 * `dir="rtl"` in an English page left the bubble where it belonged and proved
 * nothing. On a page right-to-left from the root, the bubble was put a window's
 * width out, and a bubble to the side of its trigger had its point on the far
 * edge: the arrow's offset and its edge were both written from the inline
 * start, which is the right there, while the placement they answer is physical.
 *
 * Browser-only because it is geometry, and waited out to the end of the
 * entrance, which scales the bubble and everything in it.
 */
if (hasLayout()) {
  const pointed = async (placement: string, direction: string, top = '12rem'): Promise<Pointed> => {
    document.documentElement.dir = direction
    await mount(`<div>
        <button aria-describedby="tip" id="trigger">Deploy</button>
        <helix-tooltip content="Ships the build" for="trigger" id="tip" placement="${placement}"></helix-tooltip>
        <style>
          #trigger { block-size: 2rem; inline-size: 6rem; inset-block-start: ${top}; left: calc(50% - 3rem); position: fixed }
        </style>
      </div>`)
    const tip = document.querySelector('helix-tooltip') as Tip
    await tip.updateComplete
    tip.show()
    await tip.updateComplete
    /* `computePosition` resolves after the update, and `autoUpdate` places once
       as it starts: two frames cover both. */
    await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)))
    const bubble = part(tip, 'tooltip') as HTMLElement
    await settled(bubble)
    return {
      arrow: (part(tip, 'arrow') as HTMLElement).getBoundingClientRect(),
      bubble: bubble.getBoundingClientRect(),
      side: bubble.getAttribute('data-placement'),
      trigger: (document.getElementById('trigger') as HTMLElement).getBoundingClientRect(),
    }
  }

  /* The point's center is on the edge facing the trigger, and across from the
     trigger along that edge. A rotated box's center is its center, so the
     bounding rect is fine for both. */
  const across = (arrow: DOMRect): { x: number; y: number } => ({
    x: arrow.left + arrow.width / 2,
    y: arrow.top + arrow.height / 2,
  })

  for (const direction of ['ltr', 'rtl']) {
    describe(`the point on a ${direction === 'rtl' ? 'right-to-left' : 'left-to-right'} page`, () => {
      afterEach(() => {
        document.documentElement.removeAttribute('dir')
      })

      test('above the trigger, hangs from the bottom edge over it', async () => {
        const { arrow, bubble, side, trigger } = await pointed('top', direction)
        const { x, y } = across(arrow)
        expect(side).toBe('top')
        expect(bubble.bottom).toBeLessThanOrEqual(trigger.top)
        expect(Math.abs(y - bubble.bottom)).toBeLessThanOrEqual(1)
        expect(x).toBeGreaterThanOrEqual(trigger.left)
        expect(x).toBeLessThanOrEqual(trigger.right)
      })

      test('below the trigger, stands on the top edge under it', async () => {
        const { arrow, bubble, side, trigger } = await pointed('bottom', direction)
        const { x, y } = across(arrow)
        expect(side).toBe('bottom')
        expect(bubble.top).toBeGreaterThanOrEqual(trigger.bottom)
        expect(Math.abs(y - bubble.top)).toBeLessThanOrEqual(1)
        expect(x).toBeGreaterThanOrEqual(trigger.left)
        expect(x).toBeLessThanOrEqual(trigger.right)
      })

      /* The two that failed: `right` is the right in either direction, so the
         point is on the bubble's left, and written from the inline start it was
         on the right, pointing away. */
      test('to the right of the trigger, points left from the left edge', async () => {
        const { arrow, bubble, side, trigger } = await pointed('right', direction)
        const { x, y } = across(arrow)
        expect(side).toBe('right')
        expect(bubble.left).toBeGreaterThanOrEqual(trigger.right)
        expect(Math.abs(x - bubble.left)).toBeLessThanOrEqual(1)
        expect(y).toBeGreaterThanOrEqual(trigger.top)
        expect(y).toBeLessThanOrEqual(trigger.bottom)
      })

      test('to the left of the trigger, points right from the right edge', async () => {
        const { arrow, bubble, side, trigger } = await pointed('left', direction)
        const { x, y } = across(arrow)
        expect(side).toBe('left')
        expect(bubble.right).toBeLessThanOrEqual(trigger.left)
        expect(Math.abs(x - bubble.right)).toBeLessThanOrEqual(1)
        expect(y).toBeGreaterThanOrEqual(trigger.top)
        expect(y).toBeLessThanOrEqual(trigger.bottom)
      })

      /* Asked for above, at the top of the window, where there is no room: the
         bubble flips below and the point goes with it, which the controller
         decides now rather than a sheet keyed on the side. */
      test('asked for above with no room there, flips below and points up', async () => {
        const { arrow, bubble, side, trigger } = await pointed('top', direction, '0.25rem')
        const { x, y } = across(arrow)
        expect(side).toBe('bottom')
        expect(bubble.top).toBeGreaterThanOrEqual(trigger.bottom)
        expect(Math.abs(y - bubble.top)).toBeLessThanOrEqual(1)
        expect(x).toBeGreaterThanOrEqual(trigger.left)
        expect(x).toBeLessThanOrEqual(trigger.right)
      })
    })
  }
}
