import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, part, registerDom } from '@fusion-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

const spark = async (attributes: string): Promise<HTMLElement> =>
  mount(`<helix-sparkline ${attributes}></helix-sparkline>`)

const path = (host: HTMLElement): string | null => part(host, 'line')?.getAttribute('d') ?? null

/**
 * The `y` of each reading in the drawing, in the view box's own units.
 *
 * **Anchor points, not every coordinate in the path.** This split on `[ML]` and
 * read the y of each pair, which was the whole path while the resting curve was
 * straight and is a third of it now that it is smooth: a cubic segment carries
 * two control points before the reading it lands on, and counting those makes a
 * series of three look like a series of seven. The anchor is the last pair of
 * whatever command drew the segment, which is the same point in both shapes and
 * is the only one that is a reading rather than a means of getting to it.
 */
const heights = (host: HTMLElement): number[] =>
  [...(path(host) ?? '').matchAll(/([MLC])([^MLCHVZ]*)/g)].map((command) => {
    const pairs = (command[2] ?? '').trim().split(/\s+/)
    return Number((pairs.at(-1) ?? '').split(',')[1])
  })

describe('sparkline', () => {
  test('the numbers come from an attribute, separated by spaces or by commas', async () => {
    /* The one chart here that takes an attribute. Nobody interrogates the
       squiggle beside a figure, so a fourteen-row table behind it is fourteen
       dates read aloud in place of the sentence that carries the meaning. */
    expect(heights(await spark('values="1 2 3"'))).toHaveLength(3)
    expect(heights(await spark('values="1, 2, 3"'))).toHaveLength(3)
    // An array assigned to the property stringifies to a comma list, so it
    // works where an array property would not survive React's hydration.
    expect(heights(await spark('values="1,2,3"'))).toEqual(heights(await spark('values="1 2 3"')))
  })

  test('the largest value is drawn at the top, since svg counts down', async () => {
    const rising = heights(await spark('values="1 5 9"'))
    expect(rising[0]).toBe(32)
    expect(rising[2]).toBe(0)
    expect(rising[1]).toBe(16)
  })

  test('a flat series is a flat line halfway up, not a missing one', async () => {
    // Every value equal makes the domain zero wide. The obvious arithmetic
    // divides by it, and `M NaN,NaN` is a path that draws nothing at all.
    expect(heights(await spark('values="7 7 7"'))).toEqual([16, 16, 16])
  })

  test('one value is not a trend and no values is not a line', async () => {
    expect(path(await spark('values="4"'))).toBeNull()
    expect(path(await spark('values=""'))).toBeNull()
    expect(part(await spark('values="4"'), 'terminus')).toBeNull()
  })

  test('a word among the numbers is dropped rather than plotted as NaN', async () => {
    expect(heights(await spark('values="1 oops 3"'))).toHaveLength(2)
  })

  test('a label makes it an image, and no label makes it decorative', async () => {
    /* An unnamed `role="img"` announces "graphic" and stops, which is worse
       than silence beside a figure that already names itself. */
    const named = await spark('values="1 2" label="Sessions rose over seven days"')
    expect(part(named, 'svg')?.getAttribute('role')).toBe('img')
    expect(part(named, 'svg')?.getAttribute('aria-label')).toBe('Sessions rose over seven days')
    expect(part(named, 'svg')?.hasAttribute('aria-hidden')).toBe(false)

    const bare = await spark('values="1 2"')
    expect(part(bare, 'svg')?.getAttribute('aria-hidden')).toBe('true')
    expect(part(bare, 'svg')?.hasAttribute('role')).toBe(false)
  })

  test('absent is an area, `line` is the bare stroke, and a bar is neither', async () => {
    /* What is drawn varies by plot, which is why this is a headless property
       and why the region is no longer drawn under everything and hidden.
     *
     * Absent draws the region, which is the departure the class doc argues for:
     * at the size a sparkline is drawn, a hairline in a wide box is mostly box.
     * This test asserted the opposite until the default moved, and read as a
     * failing suite rather than as a stale assertion. */
    const bare = await spark('plot="line" values="1 5 9"')
    expect(part(bare, 'line')).not.toBeNull()
    expect(part(bare, 'area')).toBeNull()
    expect(part(bare, 'bar')).toBeNull()

    const absent = await spark('values="1 5 9"')
    expect(part(absent, 'line')).not.toBeNull()
    expect(part(absent, 'area')).not.toBeNull()

    const area = await spark('plot="area" values="1 5 9"')
    expect(part(area, 'line')).not.toBeNull()
    const closed = part(area, 'area')?.getAttribute('d') ?? ''
    expect(closed).toContain(part(area, 'line')?.getAttribute('d') ?? 'no line')
    // Closed along the floor of the box and back, which is what makes it fillable.
    expect(closed.endsWith('L100,32L0,32Z')).toBe(true)

    const bars = await spark('plot="bar" values="1 5 9"')
    expect(part(bars, 'line')).toBeNull()
    expect(bars.shadowRoot?.querySelectorAll('[part="bar"]')).toHaveLength(3)
  })

  test('columns measure from zero, so their lengths are proportional to the values', async () => {
    /* The one way the plots are not interchangeable. A line says where the
       readings sit relative to each other, so its scale runs over their extent;
       a bar's length is the value, so any baseline but zero makes the lengths
       proportional to nothing.

       Over the extent, the smallest reading landed on the floor with no height
       at all, and seven readings came out as six columns and a gap. */
    const host = await spark('plot="bar" values="1 5 9"')
    const columns = [...(host.shadowRoot?.querySelectorAll('[part="bar"]') ?? [])]
    const heights = columns.map((one) => Number(one.getAttribute('height')))
    expect(heights[0]).toBeGreaterThan(0)
    /* The proportion rather than the pixels, which is the property being
       claimed: a column five times the value is five times the length. Asserted
       as an equality first, and `32/9` and `Math.abs(floor - y(value))` differ
       in the last bit of a double. */
    const tallest = heights[2] as number
    expect(Math.abs((heights[0] as number) / tallest - 1 / 9)).toBeLessThan(1e-6)
    expect(Math.abs((heights[1] as number) / tallest - 5 / 9)).toBeLessThan(1e-6)
    // Inset inside its slot, so neighbours do not touch.
    expect(Number(columns[0]?.getAttribute('width'))).toBeLessThan(100 / 3)
  })

  test('a series that goes negative hangs its columns below the baseline', async () => {
    // Zero is included at both ends, so the baseline lands inside the box.
    const host = await spark('plot="bar" values="-4 0 4"')
    const columns = [...(host.shadowRoot?.querySelectorAll('[part="bar"]') ?? [])]
    const tops = columns.map((one) => Number(one.getAttribute('y')))
    // The baseline is halfway, the negative starts there and the positive ends there.
    expect(tops[0]).toBe(16)
    expect(tops[2]).toBe(0)
    // A reading of exactly zero paints nothing, which is the honest drawing of it.
    expect(Number(columns[1]?.getAttribute('height'))).toBe(0)
  })

  test('a line still measures from its own range, so the shape fills the box', async () => {
    const host = await spark('values="1 5 9"')
    expect(heights(host)).toEqual([32, 16, 0])
  })

  test('a bar plot ends on its last column rather than on a mark', async () => {
    // A line ends somewhere and a row of columns does not.
    expect(part(await spark('plot="bar" values="1 5 9"'), 'terminus')).toBeNull()
    expect(part(await spark('values="1 5 9"'), 'terminus')).not.toBeNull()
  })

  test('one value draws no region either, since there is no line to close', async () => {
    expect(part(await spark('plot="area" values="4"'), 'area')).toBeNull()
  })

  test('a curve changes the path and nothing else about the reading', async () => {
    /* This tier and not the styled one, though it is a drawing decision: a
       curve is expressed as path data and path data is markup. `linePath` in
       `helix/core` is the implementation, specced there, so what is asserted
       here is only that the property reaches it. */
    const resting = path(await spark('values="1 5 2 6"')) ?? ''
    const straight = path(await spark('curve="straight" values="1 5 2 6"')) ?? ''
    const smooth = path(await spark('curve="smooth" values="1 5 2 6"')) ?? ''
    const stepped = path(await spark('curve="step" values="1 5 2 6"')) ?? ''
    // Saying nothing gets the smooth curve, and saying `straight` is what opts
    // out of it. Asserted as the same path rather than merely as one containing
    // a cubic, so this fails if the resting curve ever quietly becomes a third
    // thing that happens to be curved.
    expect(resting).toBe(smooth)
    expect(straight).toContain('L')
    expect(straight).not.toContain('C')
    expect(smooth).toContain('C')
    expect(stepped).toContain('H')
    /* All three start on the first reading and finish on the last. The step
       path says so in its own idiom: `H` carries only an x, because the y was
       already set by the `V` before it, so it ends `V0H100` where the other two
       end `100,0`. Asserting one spelling for all three is what the first
       version of this did, and it reported a path that was correct. */
    for (const drawn of [resting, straight, smooth, stepped]) {
      expect(drawn.startsWith('M0,32')).toBe(true)
    }
    expect(straight.endsWith('L100,0')).toBe(true)
    expect(smooth.endsWith('100,0')).toBe(true)
    expect(stepped.endsWith('V0H100')).toBe(true)
  })

  test('the area follows whatever curve the line took', async () => {
    // Otherwise the fill and the line disagree about where the top edge is.
    const host = await spark('curve="smooth" plot="area" values="1 5 2 6"')
    expect(part(host, 'area')?.getAttribute('d')).toContain(
      part(host, 'line')?.getAttribute('d') ?? 'no line',
    )
  })

  test('the mark sits on the last value', async () => {
    const host = await spark('values="9 5 1"')
    // Last value is the smallest, so the bottom of the box.
    expect(part(host, 'terminus')?.getAttribute('style')).toContain('--_chart-terminus-y: 100%')
    expect(part(host, 'terminus')?.getAttribute('style')).toContain('--_chart-terminus-x: 100%')
  })
})

describe('sparkline from a table', () => {
  const withTable = async (attributes: string): Promise<HTMLElement> => {
    await mount(`<div><table id="sessions"><tbody>
        <tr><th scope="row">Mon</th><td>10</td></tr>
        <tr><th scope="row">Tue</th><td>30</td></tr>
        <tr><th scope="row">Wed</th><td>20</td></tr>
      </tbody></table><helix-sparkline ${attributes}></helix-sparkline></div>`)
    const host = document.querySelector('helix-sparkline') as HTMLElement & {
      updateComplete: Promise<unknown>
    }
    await host.updateComplete
    return host
  }

  test('the first column of numbers is the series drawn', async () => {
    expect(heights(await withTable('for="sessions"'))).toEqual([32, 0, 16])
  })

  test('the table wins over the attribute, being the one a reader can also read', async () => {
    const host = await withTable('for="sessions" values="1 1 1 1 1"')
    expect(heights(host)).toEqual([32, 0, 16])
  })

  test('naming nothing falls back to the attribute rather than to an empty line', async () => {
    expect(heights(await withTable('for="not-here" values="1 5 9"'))).toEqual([32, 16, 0])
  })

  test('the table is watched, the way the legend watches its own', async () => {
    const host = await withTable('for="sessions"')
    const row = document.createElement('tr')
    row.innerHTML = '<th scope="row">Thu</th><td>40</td>'
    document.querySelector('#sessions tbody')?.append(row)
    await new Promise((resolve) => setTimeout(resolve, 0))
    await (host as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete
    expect(heights(host)).toHaveLength(4)
  })
})

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
         detached element, where every computed value is the empty string. The
         first version of this test did exactly that and reported the component
         for a stroke it had never lost. */
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

      /* A line plot draws no region at all now, rather than one kept invisible.
         **`plot="line"` written out, because absent is not it.** This mounted a
         sparkline with no `plot` and called it the line case, and absent is
         `area` here, deliberately and for the reason the class doc gives: at
         the size a sparkline is drawn, a hairline in a wide box is mostly box.
         So the assertion was made against the one element that must fail it,
         and the case it names was never tested. It failed only in a real
         engine, where this block runs. */
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
