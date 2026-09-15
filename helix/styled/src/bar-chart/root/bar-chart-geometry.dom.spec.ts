import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, part, registerDom, settled } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

const REVENUE = `<table id="revenue">
  <caption>Revenue by quarter</caption>
  <thead><tr><th scope="col">Quarter</th><th scope="col">Revenue</th></tr></thead>
  <tbody>
    <tr><th scope="row">Q1</th><td data-value="100">$100k</td></tr>
    <tr><th scope="row">Q2</th><td data-value="50">$50k</td></tr>
    <tr><th scope="row">Q3</th><td data-value="200">$200k</td></tr>
  </tbody>
</table>`

const chart = async (table: string, attributes: string): Promise<HTMLElement> => {
  await mount(`<div>${table}<helix-bar-chart ${attributes}></helix-bar-chart></div>`)
  const host = document.querySelector('helix-bar-chart') as HTMLElement & {
    updateComplete: Promise<unknown>
  }
  await host.updateComplete
  return host
}

/* What the drawing measures, which is the stylesheet's stroke and the SVG it is drawn in.

   The behavior is the headless element's and is tested there. */
if (hasLayout()) {
  describe('bar chart geometry', () => {
    test('the baseline keeps its weight whatever the box', async () => {
      // The view box stretches to the element and a stroke stretches with it.
      await chart(REVENUE, 'for="revenue"')
      const host = document.querySelector('helix-bar-chart') as HTMLElement
      expect(getComputedStyle(part(host, 'baseline') as Element).vectorEffect).toBe(
        'non-scaling-stroke',
      )
    })

    test('the columns are really SVG, not HTML wearing the name', async () => {
      /* A nested Lit template is parsed on its own, so a `<rect>` written in one
         has no `<svg>` around it and lands in the XHTML namespace: it takes the
         part, takes the geometry attributes, and draws nothing. */
      await chart(REVENUE, 'for="revenue"')
      const host = document.querySelector('helix-bar-chart') as HTMLElement
      const bar = part(host, 'bar') as unknown as SVGRectElement
      expect(typeof bar.getBBox).toBe('function')

      /* **After the growing, or the box is the one it started at.** Columns
         arrive from `@starting-style { height: 0 }` and transition into place,
         so `getBBox` immediately after the update reports the *used* height,
         which is zero, while the `height` attribute already holds the answer.
         Measured in Chrome: attribute 44.44, bbox 0, two transitions running;
         once they finish, bbox 44.44. */
      await settled(bar)
      expect(bar.getBBox().height).toBeGreaterThan(0)
    })
  })

  /**
   * Which end the first category is drawn at, and whether everything read
   * against the drawing agrees.
   *
   * **A category axis starts where the text does.** The names are HTML and
   * turned with `dir` on their own; the columns are SVG and did not, so on a
   * right-to-left page Q1's name stood under Q3's column. Set on the root, as a
   * page would set it.
   */
  describe('bar chart on either kind of page', () => {
    afterEach(() => {
      document.documentElement.removeAttribute('dir')
    })

    const center = (box: DOMRect): number => box.left + box.width / 2

    for (const dir of ['ltr', 'rtl'] as const) {
      test(`the first category is at the inline start, under its own name, ${dir}`, async () => {
        document.documentElement.dir = dir
        const host = await chart(REVENUE, 'for="revenue"')
        const bars = [...(host.shadowRoot?.querySelectorAll('[part="bar"]') ?? [])]
        await Promise.all(bars.map((one) => settled(one)))
        const [first, , last] = bars.map((one) => center(one.getBoundingClientRect()))
        const names = [...(host.shadowRoot?.querySelectorAll('[part="label"]') ?? [])]
        const [q1, , q3] = names.map((one) => center(one.getBoundingClientRect()))
        if (dir === 'ltr') {
          expect(first as number).toBeLessThan(last as number)
        } else {
          expect(first as number).toBeGreaterThan(last as number)
        }
        expect(names[0]?.textContent?.trim()).toBe('Q1')
        expect(Math.abs((q1 as number) - (first as number))).toBeLessThan(2)
        expect(Math.abs((q3 as number) - (last as number))).toBeLessThan(2)
      })
    }

    /* The pointer is read from the plot's right on a mirrored drawing, and the
       mark the bubble points at is placed from the inline start, so a pointer
       over the column above Q1's name asks about Q1 and is answered over it.
       Aimed by the name rather than by the column, since the column is the
       thing that was in the wrong place. */
    test('a pointer over the column named Q1 is asking about Q1, rtl', async () => {
      document.documentElement.dir = 'rtl'
      const host = await chart(REVENUE, 'for="revenue"')
      const bars = [...(host.shadowRoot?.querySelectorAll('[part="bar"]') ?? [])]
      await Promise.all(bars.map((one) => settled(one)))
      const name = (part(host, 'label') as HTMLElement).getBoundingClientRect()
      const plot = (part(host, 'plot') as HTMLElement).getBoundingClientRect()
      host.dispatchEvent(
        new PointerEvent('pointermove', {
          bubbles: true,
          clientX: center(name),
          clientY: plot.bottom - 2,
          composed: true,
          pointerType: 'mouse',
        }),
      )
      const first = (bars[0] as Element).getBoundingClientRect()
      await (host as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete
      const active = host.shadowRoot?.querySelector('[part~="group-active"]')
      expect(active?.contains(bars[0] as Element)).toBe(true)
      const mark = (part(host, 'mark') as HTMLElement).getBoundingClientRect()
      expect(mark.left).toBeGreaterThanOrEqual(first.left)
      expect(mark.left).toBeLessThanOrEqual(first.right)
    })
  })
}
