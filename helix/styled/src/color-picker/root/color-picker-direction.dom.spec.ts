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

    test('puts a full color at the left, where the square is saturated', async () => {
      const host = await picker()
      const grid = (part(host, 'grid') as HTMLElement).getBoundingClientRect()
      const handle = (part(host, 'grid-handle') as HTMLElement).getBoundingClientRect()
      expect(Math.abs(handle.left + handle.width / 2 - grid.left)).toBeLessThanOrEqual(1)
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
