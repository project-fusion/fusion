import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, part, registerDom, settled } from '@helix-io/testing/dom'

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

const _bars = (host: HTMLElement): Element[] => [
  ...(host.shadowRoot?.querySelectorAll('[part="bar"]') ?? []),
]

const _labels = (host: HTMLElement): string[] =>
  [...(host.shadowRoot?.querySelectorAll('[part="label"]') ?? [])].map(
    (one) => one.textContent?.trim() ?? '',
  )

/* What the drawing measures, which is the stylesheet's stroke and the SVG it is drawn in.

   The behavior is the base element's and is tested there. */
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
         once they finish, bbox 44.44. The old form read the first of those and
         reported a bar chart that draws nothing. */
      await settled(bar)
      expect(bar.getBBox().height).toBeGreaterThan(0)
    })
  })
}
