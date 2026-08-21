import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, part, registerDom } from '@fusion-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

const spark = async (attributes: string): Promise<HTMLElement> =>
  mount(`<helix-sparkline ${attributes}></helix-sparkline>`)

const path = (host: HTMLElement): string | null => part(host, 'line')?.getAttribute('d') ?? null

/** The `y` of each point in the drawing, in the view box's own units. */
const heights = (host: HTMLElement): number[] =>
  (path(host) ?? '')
    .split(/[ML]/)
    .filter((one) => one !== '')
    .map((pair) => Number(pair.split(',')[1]))

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
    expect(part(await spark('values="4"'), 'point')).toBeNull()
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

  test('the region under the line is drawn whether or not it is painted', async () => {
    /* Geometry belongs to the tier below and paint to this one, so the shape is
       always there and `appearance` decides whether anything is poured in. A
       headless consumer gets the region without having to work out that a
       sparkline's baseline is its own minimum rather than zero. */
    const host = await spark('values="1 5 9"')
    const area = part(host, 'area')?.getAttribute('d') ?? ''
    expect(area).toContain(part(host, 'line')?.getAttribute('d') ?? 'no line')
    // Closed along the floor of the box and back, which is what makes it fillable.
    expect(area.endsWith('L100,32L0,32Z')).toBe(true)
  })

  test('one value draws no region either, since there is no line to close', async () => {
    expect(part(await spark('values="4"'), 'area')).toBeNull()
  })

  test('the mark sits on the last value', async () => {
    const host = await spark('values="9 5 1"')
    // Last value is the smallest, so the bottom of the box.
    expect(part(host, 'point')?.getAttribute('style')).toContain('--_sparkline-y: 100%')
    expect(part(host, 'point')?.getAttribute('style')).toContain('--_sparkline-x: 100%')
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

    test('the region is unpainted by default and washed under appearance', async () => {
      /* Two elements rather than a fill on the line itself: a closed path
         strokes its closing edges, so filling the line would draw a rule along
         the bottom of the box and up both sides. Asserted through the computed
         fill, since the shape is present either way. */
      /* Both in one mount. `mount` replaces the body, so reading the first
         one's computed style after mounting the second reads a detached
         element, and every computed value comes back as the empty string. The
         first version of this test did exactly that and reported the component
         for a stroke it had never lost. */
      await mount(`<div>
        <helix-sparkline id="plain" values="1 9 3"></helix-sparkline>
        <helix-sparkline appearance="area" id="washed" values="1 9 3"></helix-sparkline>
      </div>`)
      const plain = document.getElementById('plain') as HTMLElement
      const washed = document.getElementById('washed') as HTMLElement
      await Promise.all(
        [plain, washed].map(
          (one) => (one as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete,
        ),
      )

      expect(getComputedStyle(part(plain, 'area') as Element).fill).toBe('none')
      expect(getComputedStyle(part(washed, 'area') as Element).fill).not.toBe('none')
      // The line stays at full strength over the wash, which an `opacity` on
      // the element would not have allowed.
      expect(getComputedStyle(part(washed, 'line') as Element).stroke).toBe(
        getComputedStyle(part(plain, 'line') as Element).stroke,
      )
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
      const mark = (part(host, 'point') as HTMLElement).getBoundingClientRect()
      expect(getComputedStyle(line).vectorEffect).toBe('non-scaling-stroke')
      expect(Math.abs(mark.width - mark.height)).toBeLessThan(0.5)
      expect(Math.abs(host.getBoundingClientRect().width - 400)).toBeLessThan(1)
    })
  })
}
