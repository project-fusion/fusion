import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

/* Saturation runs along the line, the way the native ranges under the square
   and the two rails already move on a right-to-left page, so the square, the
   handle and a press on it have to agree with them.

   Before, the handle stood at the saturation from the right while the square
   was painted and read from the left, so a full red's handle sat on the white
   corner and a press there chose a gray. Browser only: the side is a `:dir()`
   rule and the press is measured against a box happy-dom does not lay out. */
if (hasLayout()) {
  describe('the square on a right-to-left page', () => {
    afterEach(() => {
      document.documentElement.removeAttribute('dir')
    })

    type Picker = HTMLElement & { updateComplete: Promise<unknown>; value: string }

    const picker = async (): Promise<Picker> => {
      document.documentElement.dir = 'rtl'
      const host = (await mount(
        '<helix-color-picker default-value="#ff0000" label="Color"></helix-color-picker>',
      )) as Picker
      await host.updateComplete
      return host
    }

    /* Where the mark's center sits, in page coordinates. It is the square's own
       `::after` rather than a box, so there is no rect to read: the computed
       `left` is used pixels against the square's padding box, and the flip is a
       percentage of the mark's own width. */
    const center = (square: HTMLElement): number => {
      const drawn = getComputedStyle(square, '::after')
      const width = Number.parseFloat(drawn.width)
      const flip = drawn.translate.startsWith('50%') ? width / 2 : -width / 2
      return square.getBoundingClientRect().left + Number.parseFloat(drawn.left) + width / 2 + flip
    }

    /* Half a mark in from the edge, which is as close as the mark comes to one:
       centered on the edge itself, half of it was outside the picker. */
    test('puts a full color at the left, where the square is saturated', async () => {
      const host = await picker()
      const square = part(host, 'grid') as HTMLElement
      const half = Number.parseFloat(getComputedStyle(square, '::after').width) / 2
      expect(
        Math.abs(center(square) - (square.getBoundingClientRect().left + half)),
      ).toBeLessThanOrEqual(1)
    })

    test('and a press at the right edge takes the color out', async () => {
      const host = await picker()
      const grid = part(host, 'grid') as HTMLElement
      const box = grid.getBoundingClientRect()
      grid.dispatchEvent(
        new PointerEvent('pointerdown', {
          bubbles: true,
          clientX: box.right + 2,
          clientY: box.top - 2,
          pointerId: 1,
        }),
      )
      await host.updateComplete
      expect(host.value).toBe('#ffffff')
    })
  })
}
