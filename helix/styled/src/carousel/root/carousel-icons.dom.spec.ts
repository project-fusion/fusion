import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

/* An icon slotted in place of a caret comes out the caret's size and color,
   which `::slotted()` has to say on its own: a rule for the drawn caret never
   reaches what a consumer slots, and an `<svg>` with no size of its own lays
   out at 300 by 150. */
if (hasLayout()) {
  describe('an icon slotted on an arrow', () => {
    test('takes the size and color of the caret it replaces', async () => {
      const host =
        (await mount(`<helix-carousel label="Folders" controls="always" style="inline-size: 400px">
        <div>One</div>
        <div>Two</div>
        <svg slot="previous-icon" viewBox="0 0 16 16"><rect width="16" height="16" fill="currentColor" /></svg>
      </helix-carousel>`)) as HTMLElement & { updateComplete: Promise<unknown> }
      await host.updateComplete
      await host.updateComplete
      const slotted = host.querySelector('svg') as SVGElement
      const drawn = part(host, 'next-mark') as SVGElement
      const box = (one: Element): string => {
        const { height, width } = one.getBoundingClientRect()
        return `${width}x${height}`
      }
      expect(box(slotted)).toBe(box(drawn))
      expect(getComputedStyle(slotted).color).toBe(getComputedStyle(drawn).color)
    })
  })
}
