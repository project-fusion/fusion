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
   * Which corners of a column are round, from the clip that takes them off:
   * the four corners from the top left, clockwise, `r` round and `-` square.
   *
   * **The far end only.** A negative column hung below zero with its round
   * corners on the baseline, because the rule rounded the top whatever the
   * sign.
   */
  describe('bar chart corners', () => {
    const SIGNS = `<table id="signs">
      <thead><tr><th>Quarter</th><th>Net</th></tr></thead>
      <tbody>
        <tr><th scope="row">Q1</th><td data-value="3">3</td></tr>
        <tr><th scope="row">Q2</th><td data-value="-4">-4</td></tr>
      </tbody>
    </table>`
    const corners = (one: Element): string => {
      const round = /round (.+)\)$/.exec(getComputedStyle(one).clipPath)?.[1] ?? '0px'
      const radii = round.split(' / ')[0]?.trim().split(/\s+/) ?? []
      const [a = '0px', b = a, c = a, d = b] = radii
      return [a, b, c, d].map((radius) => (Number.parseFloat(radius) > 0 ? 'r' : '-')).join('')
    }
    const columns = async (attributes: string): Promise<string[]> => {
      const host = await chart(SIGNS, `for="signs" ${attributes}`)
      return [...(host.shadowRoot?.querySelectorAll('[part~="bar"]') ?? [])].map(corners)
    }

    test('a column above zero rounds its top, and one below rounds its bottom', async () => {
      expect(await columns('')).toEqual(['rr--', '--rr'])
    })

    test('a bar right of zero rounds its right, and one left of it rounds its left', async () => {
      expect(await columns('orientation="horizontal"')).toEqual(['-rr-', 'r--r'])
    })

    test('the end of a stack below zero rounds its bottom, and the joins are square', async () => {
      const host = await chart(
        `<table id="stack">
          <thead><tr><th>Quarter</th><th>A</th><th>B</th><th>C</th></tr></thead>
          <tbody><tr><th scope="row">Q1</th><td>3</td><td>-2</td><td>-1</td></tr></tbody>
        </table>`,
        'for="stack" stacked',
      )
      const drawn = [...(host.shadowRoot?.querySelectorAll('[part~="bar"]') ?? [])].map(corners)
      expect(drawn).toEqual(['rr--', '----', '--rr'])
    })
  })

  /**
   * Which edge of a column `outlined` and `subtle` leave open, from the clip's
   * inset: the one side taken in by half the stroke.
   *
   * **The edge on the baseline, whichever way the column grows.** A column
   * below zero left open its far end and drew its edge along the baseline,
   * because the inset took the bottom whatever the sign.
   */
  describe('bar chart edges', () => {
    const SIDES = ['top', 'right', 'bottom', 'left']
    const open = (one: Element): string => {
      const inset = /inset\(([^)]*?)(?: round .*)?\)$/.exec(getComputedStyle(one).clipPath)?.[1]
      const [a = '0px', b = a, c = a, d = b] = inset?.trim().split(/\s+/) ?? []
      const taken = [a, b, c, d].flatMap((side, at) =>
        Number.parseFloat(side) > 0 ? [SIDES[at]] : [],
      )
      return taken.join(' ') || 'none'
    }
    const edges = async (table: string, attributes: string): Promise<string[]> => {
      const host = await chart(table, attributes)
      return [...(host.shadowRoot?.querySelectorAll('[part~="bar"]') ?? [])].map(open)
    }
    const SIGNS = `<table id="signs">
      <thead><tr><th>Quarter</th><th>Net</th></tr></thead>
      <tbody>
        <tr><th scope="row">Q1</th><td data-value="3">3</td></tr>
        <tr><th scope="row">Q2</th><td data-value="-4">-4</td></tr>
      </tbody>
    </table>`
    const STACK = `<table id="stack">
      <thead><tr><th>Quarter</th><th>A</th><th>B</th><th>C</th></tr></thead>
      <tbody>
        <tr><th scope="row">Q1</th><td>3</td><td>-2</td><td>-1</td></tr>
        <tr><th scope="row">Q2</th><td>2</td><td>1</td><td>-3</td></tr>
      </tbody>
    </table>`

    test('a column above zero leaves open its bottom, and one below its top', async () => {
      for (const emphasis of ['outlined', 'subtle']) {
        expect(await edges(SIGNS, `for="signs" emphasis="${emphasis}"`)).toEqual(['bottom', 'top'])
      }
    })

    test('a bar right of zero leaves open its left, and one left of it its right', async () => {
      expect(
        await edges(SIGNS, 'for="signs" emphasis="outlined" orientation="horizontal"'),
      ).toEqual(['left', 'right'])
    })

    test('each segment of a stack leaves open the edge nearer zero, so every join is drawn once', async () => {
      expect(await edges(STACK, 'for="stack" emphasis="outlined" stacked')).toEqual([
        'bottom',
        'top',
        'top',
        'bottom',
        'bottom',
        'top',
      ])
    })

    test('a filled column leaves nothing open', async () => {
      expect(await edges(SIGNS, 'for="signs"')).toEqual(['none', 'none'])
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
        const bars = [...(host.shadowRoot?.querySelectorAll('[part~="bar"]') ?? [])]
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
      const bars = [...(host.shadowRoot?.querySelectorAll('[part~="bar"]') ?? [])]
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

  /**
   * A chart of more columns than its plot has pixels, whose columns are paths
   * and whose reading shown is drawn again over them.
   *
   * **Read from the slot under the pointer, and shown where it stands.** An
   * element a column cost 726 milliseconds a move of the pointer at 10,000
   * readings, and the column a reader moved to was a tenth of a pixel wide.
   */
  describe('bar chart past one column a pixel', () => {
    afterEach(() => {
      document.documentElement.removeAttribute('dir')
    })

    type Wide = HTMLElement & { data: unknown; updateComplete: Promise<unknown> }

    const wide = async (): Promise<Wide> => {
      await mount(
        '<div><helix-bar-chart label="Load" style="inline-size: 600px"></helix-bar-chart></div>',
      )
      const host = document.querySelector('helix-bar-chart') as Wide
      host.data = {
        columns: ['At', 'Load'],
        rows: Array.from({ length: 5000 }, (_, at) => [`p${at}`, (at % 50) - 10]),
      }
      for (let pass = 0; pass < 3; pass++) {
        await new Promise((resolve) => requestAnimationFrame(resolve))
        await host.updateComplete
      }
      return host
    }

    const move = async (host: Wide, x: number, y: number): Promise<void> => {
      host.dispatchEvent(
        new PointerEvent('pointermove', {
          bubbles: true,
          clientX: x,
          clientY: y,
          composed: true,
          pointerType: 'mouse',
        }),
      )
      await host.updateComplete
    }

    for (const dir of ['ltr', 'rtl'] as const) {
      test(`the pointer reads the category under it, drawn again two pixels thick, ${dir}`, async () => {
        document.documentElement.dir = dir
        const host = await wide()
        expect(host.shadowRoot?.querySelectorAll('rect[part~="bar"]')).toHaveLength(0)
        const plot = (part(host, 'plot') as HTMLElement).getBoundingClientRect()
        /* A quarter of the way along from where the drawing starts. */
        const x = dir === 'ltr' ? plot.left + plot.width / 4 : plot.right - plot.width / 4
        await move(host, x, plot.top + plot.height / 2)
        expect(part(host, 'tooltip-label')?.textContent).toBe('p1250')
        const shown = host.shadowRoot?.querySelector('[part~="group-active"] [part~="bar"]')
        const box = (shown as Element).getBoundingClientRect()
        expect(box.width).toBeGreaterThan(1.99)
        expect(Math.abs(box.left + box.width / 2 - x)).toBeLessThan(1)
        expect(getComputedStyle(shown as Element).transitionDuration).toBe('0s')
      })
    }

    test('a move of the pointer writes none of the columns again', async () => {
      const host = await wide()
      const plot = (part(host, 'plot') as HTMLElement).getBoundingClientRect()
      const written: string[] = []
      const watch = new MutationObserver((records) => {
        for (const record of records) {
          if ((record.target as Element).localName === 'path') {
            written.push(record.attributeName ?? '')
          }
        }
      })
      watch.observe(host.shadowRoot as ShadowRoot, { attributes: true, subtree: true })
      for (const at of [0.2, 0.4, 0.6]) {
        await move(host, plot.left + plot.width * at, plot.top + plot.height / 2)
      }
      watch.disconnect()
      expect(written).toEqual([])
    })

    test('a path of columns has no corner to round', async () => {
      const host = await wide()
      for (const path of host.shadowRoot?.querySelectorAll('path[part~="bar"]') ?? []) {
        const round = /round (.+)\)$/.exec(getComputedStyle(path).clipPath)?.[1] ?? '0px'
        expect(round.split(/\s+/).every((radius) => Number.parseFloat(radius) === 0)).toBe(true)
      }
    })
  })
}
