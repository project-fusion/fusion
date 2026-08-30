import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

const _spark = async (attributes: string): Promise<HTMLElement> =>
  mount(`<helix-sparkline ${attributes}></helix-sparkline>`)

const path = (host: HTMLElement): string | null => part(host, 'line')?.getAttribute('d') ?? null

/**
 * The `y` of each reading in the drawing, in the view box's own units.
 *
 * **Anchor points, not every coordinate in the path.** The resting curve is
 * smooth, so a cubic segment carries two control points before the reading it
 * lands on, and counting every pair makes a series of three look like a series
 * of seven. The anchor is the last pair of whatever command drew the segment,
 * which is the same point in a straight path and a curved one and is the only
 * one that is a reading rather than a means of getting to it.
 */
const _heights = (host: HTMLElement): number[] =>
  [...(path(host) ?? '').matchAll(/([MLC])([^MLCHVZ]*)/g)].map((command) => {
    const pairs = (command[2] ?? '').trim().split(/\s+/)
    return Number((pairs.at(-1) ?? '').split(',')[1])
  })

/* The stroke, the wash and the mark, which are lengths and paints this tier owns.

   The behavior is the headless element's and is tested there. */
if (hasLayout()) {
  describe('sparkline geometry', () => {
    test('the path is really SVG, and not an HTML element wearing the name', async () => {
      /* The bug this exists for, and every other spec in this file passed while
         it was there. A nested Lit template is parsed on its own, so the
         `<path>` written in one had no `<svg>` around it and came out in the
         XHTML namespace. It took the part, took the `d`, inherited the stroke,
         reported `vector-effect: non-scaling-stroke` when asked, and drew
         nothing whatsoever, because geometry belongs to the SVG namespace and
         not to the tag name.

         `getBBox` is the shortest question that separates the two: an HTML
         element does not have it. The width is asserted as well, since a real
         path that happened to be empty would answer zero. */
      const host = await mount('<helix-sparkline values="1 9 3 7 2"></helix-sparkline>')
      const line = part(host, 'line') as unknown as SVGPathElement
      expect(typeof line.getBBox).toBe('function')
      expect(line.getBBox().width).toBeGreaterThan(0)
      expect(line.getBBox().height).toBeGreaterThan(0)
    })

    test('the wash is a ramp off the line, and the line keeps its full strength', async () => {
      /* Two elements rather than a fill on the line itself: a closed path
         strokes its closing edges, so filling the line would draw a rule along
         the bottom of the box and up both sides.

         Both mounted together, because `mount` replaces the body and reading
         the first one's computed style after mounting the second reads a
         detached element, where every computed value is the empty string. That
         reads as a component that lost its stroke. */
      await mount(`<div>
        <helix-sparkline id="bare" plot="line" values="1 9 3"></helix-sparkline>
        <helix-sparkline id="washed" plot="area" values="1 9 3"></helix-sparkline>
      </div>`)
      const plain = document.getElementById('bare') as HTMLElement
      const washed = document.getElementById('washed') as HTMLElement
      await Promise.all(
        [plain, washed].map(
          (one) => (one as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete,
        ),
      )

      /* A line plot draws no region at all, rather than one kept invisible.
         **`plot="line"` written out, because absent is not it.** Absent is
         `area` here, deliberately and for the reason the class doc gives: at
         the size a sparkline is drawn, a hairline in a wide box is mostly box.
         A sparkline with no `plot` is therefore the one element that must fail
         this assertion, and it fails only in a real engine, where this block
         runs. */
      expect(part(plain, 'area')).toBeNull()
      const stops = [...(washed.shadowRoot?.querySelectorAll('stop') ?? [])]
      const opacities = stops.map((stop) => Number(getComputedStyle(stop).stopOpacity))
      expect(opacities[0]).toBeGreaterThan(opacities[1] as number)
      expect(opacities[1]).toBeGreaterThan(0)
      // The line stays at full strength over it, which an `opacity` on the
      // element would not have allowed.
      expect(getComputedStyle(part(washed, 'line') as Element).stroke).toBe(
        getComputedStyle(part(plain, 'line') as Element).stroke,
      )
    })

    test('weight moves the stroke, and the hook still wins over it', async () => {
      await mount(`<div>
        <helix-sparkline id="thin" values="1 9 3" weight="thin"></helix-sparkline>
        <helix-sparkline id="regular" values="1 9 3"></helix-sparkline>
        <helix-sparkline id="thick" values="1 9 3" weight="thick"></helix-sparkline>
      </div>`)
      const widths = await Promise.all(
        ['thin', 'regular', 'thick'].map(async (id) => {
          const host = document.getElementById(id) as HTMLElement & {
            updateComplete: Promise<unknown>
          }
          await host.updateComplete
          return Number.parseFloat(getComputedStyle(part(host, 'line') as Element).strokeWidth)
        }),
      )
      expect(widths[0]).toBeLessThan(widths[1] as number)
      expect(widths[1]).toBeLessThan(widths[2] as number)
    })

    test('the line keeps its weight whatever the box, and the mark stays round', async () => {
      /* `preserveAspectRatio="none"` is what lets one drawing fill any slot and
         it stretches everything in that coordinate space with it. The stroke
         escapes through `vector-effect`; a circle cannot, which is why the mark
         is an element beside the drawing rather than a `<circle>` inside it. */
      const host = await mount(
        `<helix-sparkline
           style="--sparkline-inline-size: 400px; --sparkline-block-size: 24px"
           values="1 9 3 7 2"
         ></helix-sparkline>`,
      )
      const line = part(host, 'line') as SVGPathElement
      const mark = (part(host, 'terminus') as HTMLElement).getBoundingClientRect()
      expect(getComputedStyle(line).vectorEffect).toBe('non-scaling-stroke')
      expect(Math.abs(mark.width - mark.height)).toBeLessThan(0.5)
      expect(Math.abs(host.getBoundingClientRect().width - 400)).toBeLessThan(1)
    })
  })
}
