import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

/* Browser only: every claim here is about where a box landed, and the row is
   laid out by this tier's stylesheet rather than by the markup. The headless
   tier ships none, so the same measurements there read unstyled buttons in
   normal flow and would answer a different question. */
if (hasLayout()) {
  type Rating = HTMLElement & { updateComplete: Promise<unknown>; value: string }

  const rating = async (attrs: string): Promise<Rating> => {
    const host = (await mount(`<helix-rating label="Rate this" ${attrs}></helix-rating>`)) as Rating
    await host.updateComplete
    return host
  }

  describe('where a rating puts the places a reader presses', () => {
    /* One rating at a time, and each target measured against the row it sits
       in: `mount` replaces the body, so two cannot be on the page at once and a
       box read off the one that left is all zeros. */
    const target = async (
      attrs: string,
      score: string,
    ): Promise<{ left: number; width: number }> => {
      const host = await rating(attrs)
      const row = (part(host, 'marks') as HTMLElement).getBoundingClientRect()
      const box = (
        (host.shadowRoot as ShadowRoot).querySelector(
          `[part="option"][data-score="${score}"]`,
        ) as HTMLElement
      ).getBoundingClientRect()
      return { left: box.left - row.left, width: box.width }
    }

    test('a floor drops a target and leaves the rest where they were', async () => {
      /* The pitch is the whole row divided by every step it can show, and a
         target sits at its own place in that row. Counted off the steps a floor
         leaves open instead, `min="3"` would widen every target and slide the
         row left, so the fourth star would be pressed somewhere over the
         second. */
      const open = await target('value="1"', '4')
      const floored = await target('min="3" value="3"', '4')
      expect(floored.width).toBeCloseTo(open.width, 1)
      expect(floored.left).toBeCloseTo(open.left, 1)
    })

    test('and a target still lands on the mark it names', async () => {
      // The fourth of five, so its center is past the middle of the row.
      const host = await rating('min="3" value="3"')
      const row = (part(host, 'marks') as HTMLElement).getBoundingClientRect()
      const fill = (part(host, 'fill') as HTMLElement).getBoundingClientRect()
      const box = (
        (host.shadowRoot as ShadowRoot).querySelector(
          '[part="option"][data-score="3"]',
        ) as HTMLElement
      ).getBoundingClientRect()
      // The row is filled to three, so the third mark ends where the fill does.
      expect(box.left).toBeLessThan(row.left + fill.width)
      expect(box.right).toBeGreaterThan(row.left + fill.width - box.width)
    })
  })

  describe('the row a rating keeps for its marks', () => {
    test('holds the marks and the readout, and the question stands over it', async () => {
      /* A hint beside the stars would land in the middle of a line of them, and
         a row that stretched to hold one would stop a rating sitting in a
         sentence. So the host is the column and `field` is the row. */
      const host = await rating('hint="Five is best" show-value value="3"')
      const field = (part(host, 'field') as HTMLElement).getBoundingClientRect()
      const marks = (part(host, 'marks') as HTMLElement).getBoundingClientRect()
      const value = (part(host, 'value') as HTMLElement).getBoundingClientRect()
      const label = (part(host, 'label') as HTMLElement).getBoundingClientRect()
      const hint = (part(host, 'hint') as HTMLElement).getBoundingClientRect()
      expect(value.left).toBeGreaterThanOrEqual(marks.right)
      expect(Math.round(field.top)).toBe(Math.round(marks.top))
      expect(label.bottom).toBeLessThanOrEqual(field.top)
      expect(hint.top).toBeGreaterThanOrEqual(field.bottom)
    })

    test('and a rating with nothing around it is still a row on a line of text', async () => {
      /* `inline-flex` and not `flex`: a rating goes in a product card and a
         table cell, and a block one would take the width of whatever holds it. */
      const host = await rating('value="3"')
      expect(host.getBoundingClientRect().width).toBeLessThan(
        (document.body as HTMLElement).getBoundingClientRect().width,
      )
      expect(getComputedStyle(host).display).toBe('inline-flex')
    })
  })
}
