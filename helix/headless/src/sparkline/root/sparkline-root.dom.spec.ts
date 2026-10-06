import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

const spark = async (attributes: string): Promise<HTMLElement> =>
  mount(`<helix-headless-sparkline ${attributes}></helix-headless-sparkline>`)

const path = (host: HTMLElement): string | null => part(host, 'line')?.getAttribute('d') ?? null

/**
 * The `y` of each reading in the drawing, in the view box's own units.
 *
 * **Anchor points, not every coordinate in the path.** A cubic segment carries
 * two control points before the reading it lands on, so reading the y of every
 * pair makes a series of three look like a series of seven. The anchor is the
 * last pair of whatever command drew the segment, which is the same point in
 * every shape and is the only one that is a reading rather than a means of
 * getting to it.
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
    expect(heights(await spark('values="1,2,3"'))).toEqual(heights(await spark('values="1 2 3"')))
  })

  /* React 19 sets a property, so `values={[...]}` arrives as an array. Lit does
     not stringify a property, and the split threw inside the render, leaving
     the old line on the screen. */
  test('an array assigned to the property is drawn', async () => {
    const host = (await spark('values="1 2 3"')) as HTMLElement & {
      updateComplete: Promise<unknown>
      values: unknown
    }
    host.values = [10, 50, 20, 40]
    await host.updateComplete
    expect(heights(host)).toHaveLength(4)
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

  test('a label makes it a named drawing read by key, and no label makes it decorative', async () => {
    /* An unnamed graphic announces "graphic" and stops, which is worse than
       silence beside a figure that already names itself. Named, it is the
       focusable `application` every chart's plot is; with nothing to read,
       an image. */
    const named = await spark('values="1 2" label="Sessions rose over seven days"')
    expect(part(named, 'svg')?.getAttribute('role')).toBe('application')
    expect(part(named, 'svg')?.getAttribute('tabindex')).toBe('0')
    const empty = await spark('label="Sessions"')
    expect(part(empty, 'svg')?.getAttribute('role')).toBe('img')
    expect(part(empty, 'svg')?.hasAttribute('tabindex')).toBe(false)
    expect(part(named, 'svg')?.getAttribute('aria-label')).toBe('Sessions rose over seven days')
    expect(part(named, 'svg')?.hasAttribute('aria-hidden')).toBe(false)

    const bare = await spark('values="1 2"')
    expect(part(bare, 'svg')?.getAttribute('aria-hidden')).toBe('true')
    expect(part(bare, 'svg')?.hasAttribute('role')).toBe(false)
    expect(part(bare, 'svg')?.hasAttribute('tabindex')).toBe(false)
    expect(part(bare, 'live')).toBeNull()
  })

  test('absent is an area, `line` is the bare stroke, and a bar is neither', async () => {
    /* What is drawn varies by plot, which is why this is a headless property.
       Absent draws the region, which is the departure the class doc argues for:
       at the size a sparkline is drawn, a hairline in a wide box is mostly
       box. */
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
       claimed: a column five times the value is five times the length. Not an
       equality: `32/9` and `Math.abs(floor - y(value))` differ in the last bit
       of a double. */
    const tallest = heights[2] as number
    expect(Math.abs((heights[0] as number) / tallest - 1 / 9)).toBeLessThan(1e-6)
    expect(Math.abs((heights[1] as number) / tallest - 5 / 9)).toBeLessThan(1e-6)
    // Inset inside its slot, so neighbors do not touch.
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
       end `100,0`. One spelling asserted across all three reports a correct
       path as a failure. */
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
    expect(part(host, 'terminus')?.getAttribute('style')).toContain('--chart-terminus-y: 100%')
    expect(part(host, 'terminus')?.getAttribute('style')).toContain('--chart-terminus-x: 100%')
  })
})

describe('sparkline from a table', () => {
  const withTable = async (attributes: string): Promise<HTMLElement> => {
    await mount(`<div><table id="sessions"><tbody>
        <tr><th scope="row">Mon</th><td>10</td></tr>
        <tr><th scope="row">Tue</th><td>30</td></tr>
        <tr><th scope="row">Wed</th><td>20</td></tr>
      </tbody></table><helix-headless-sparkline ${attributes}></helix-headless-sparkline></div>`)
    const host = document.querySelector('helix-headless-sparkline') as HTMLElement & {
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

/* Every other chart is read by key, a reading at a time, and Sparkline was the
   one that could not be: no keys, no readout, nothing under a pointer. It now
   takes the same pointer controller. */
describe('reading a sparkline', () => {
  type Spark = HTMLElement & {
    pointer: { set: (at: number) => void }
    updateComplete: Promise<unknown>
  }
  const press = async (host: Spark, key: string): Promise<void> => {
    part(host, 'svg')?.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, composed: true, key }),
    )
    await host.updateComplete
  }

  test('the keys walk the readings, and the readout says each with where it stands', async () => {
    const host = (await spark('label="Sessions" values="1240 1318 1102" locale="en"')) as Spark
    expect(part(host, 'live')?.textContent).toBe('')
    await press(host, 'ArrowRight')
    await press(host, 'ArrowRight')
    expect(part(host, 'live')?.textContent).toBe('1,318 (2 of 3)')
    await press(host, 'End')
    expect(part(host, 'live')?.textContent).toBe('1,102 (3 of 3)')
    expect(part(host, 'readout')?.textContent).toBe('1,102')
    await press(host, 'Escape')
    expect(part(host, 'cursor')).toBeNull()
  })

  test('a table gives each reading its row and its cell as written', async () => {
    await mount(
      `<div><table id="deploys"><tbody><tr><th>Mon</th><td data-value="4000">$4k</td></tr><tr><th>Tue</th><td data-value="12000">$12k</td></tr></tbody></table><helix-headless-sparkline for="deploys" label="Deploys"></helix-headless-sparkline></div>`,
    )
    const host = document.querySelector('helix-headless-sparkline') as Spark
    await host.updateComplete
    await press(host, 'Home')
    expect(part(host, 'live')?.textContent).toBe('Mon: $4k (1 of 2)')
  })

  test('a pointer resting on a reading marks it and writes it, at its place', async () => {
    const host = (await spark('values="2 8 4" plot="bar"')) as Spark
    host.pointer.set(1)
    await host.updateComplete
    const cursor = part(host, 'cursor') as HTMLElement
    expect(cursor.getAttribute('style')).toContain('inset-inline-start: 50%')
    expect(cursor.getAttribute('style')).toContain('inset-block-start: 0%')
    expect(part(host, 'readout')?.textContent).toBe('8')
  })

  test('`marks` marks the highest and the lowest reading, and absent marks none', async () => {
    const host = await spark('values="5 9 1 6" marks="high low"')
    expect(part(host, 'high')?.getAttribute('style')).toContain('inset-block-start: 0%')
    expect(part(host, 'low')?.getAttribute('style')).toContain('inset-block-start: 100%')
    const plain = await spark('values="5 9 1 6"')
    expect([part(plain, 'high'), part(plain, 'low')]).toEqual([null, null])
  })

  /* A blank cell joined across claims a value the table does not have. */
  test('a blank cell in a table is a gap in the line, and the readings keep their places', async () => {
    await mount(
      `<div><table id="gappy"><tbody><tr><th>Mon</th><td>4</td></tr><tr><th>Tue</th><td>6</td></tr><tr><th>Wed</th><td></td></tr><tr><th>Thu</th><td>8</td></tr><tr><th>Fri</th><td>2</td></tr></tbody></table><helix-headless-sparkline for="gappy" plot="line"></helix-headless-sparkline></div>`,
    )
    const host = document.querySelector('helix-headless-sparkline') as Spark
    await host.updateComplete
    const d = path(host) ?? ''
    expect(d.match(/M/g)).toHaveLength(2)
    expect(d.startsWith('M0,')).toBe(true)
    expect(d).toContain('M75,')
  })
})

/* Named, a sparkline said its name and nothing of what the readings came to;
   the other charts' summaries say it. */
describe('what a named sparkline says of itself', () => {
  const svgOf = (host: HTMLElement): Element | null => part(host, 'svg')

  test('describes the drawing with the first, the last, the highest and the lowest reading', async () => {
    const host = await spark('label="Sessions" values="12 30 8 20"')
    const overview = part(host, 'overview') as HTMLElement
    expect([
      svgOf(host)?.getAttribute('aria-describedby'),
      overview.id,
      overview.hidden,
      overview.textContent,
    ]).toEqual([
      'sparkline-overview',
      'sparkline-overview',
      true,
      'From 12 to 20, highest 30, lowest 8',
    ])
  })

  test('says nothing more where it is decorative, or `overview-label` is empty', async () => {
    const plain = await spark('values="12 30 8 20"')
    const quiet = await spark('label="Sessions" overview-label="" values="12 30 8 20"')
    expect([part(plain, 'overview'), part(quiet, 'overview')]).toEqual([null, null])
    expect(svgOf(quiet)?.hasAttribute('aria-describedby')).toBe(false)
  })

  /* Every chart is named by an `aria-label` on it; a sparkline took `label` alone. */
  test('is named by an `aria-label` on it, as `label` names it', async () => {
    const host = (await spark('aria-label="Sessions" values="12 30"')) as HTMLElement & {
      updateComplete: Promise<unknown>
    }
    expect([svgOf(host)?.getAttribute('aria-label'), svgOf(host)?.getAttribute('role')]).toEqual([
      'Sessions',
      'application',
    ])
    host.setAttribute('aria-label', 'Visits')
    await host.updateComplete
    expect(svgOf(host)?.getAttribute('aria-label')).toBe('Visits')
  })
})

describe('range', () => {
  test('draws a band between two values, and the scale holds it', async () => {
    const host = await spark('values="5 6 7" range="0 10"')
    const band = part(host, 'range')
    expect([band?.getAttribute('y'), band?.getAttribute('height')]).toEqual(['0', '32'])
    expect(part(await spark('values="5 6 7"'), 'range')).toBeNull()
  })
})

/* Line Chart draws a dot on a reading between two blanks; a sparkline drew
   nothing there. */
describe('a lone reading', () => {
  test('takes a `lone` mark where a blank is on each side', async () => {
    await mount(
      `<table id="lone"><tbody><tr><th>Mon</th><td>4</td></tr><tr><th>Tue</th><td></td></tr><tr><th>Wed</th><td>6</td></tr><tr><th>Thu</th><td></td></tr><tr><th>Fri</th><td>5</td></tr><tr><th>Sat</th><td>7</td></tr></tbody></table><helix-headless-sparkline for="lone"></helix-headless-sparkline>`,
    )
    const host = document.querySelector('helix-headless-sparkline') as HTMLElement & {
      updateComplete: Promise<unknown>
    }
    await host.updateComplete
    await new Promise((done) => setTimeout(done, 0))
    await host.updateComplete
    expect(host.shadowRoot?.querySelectorAll('[part="lone"]').length).toBe(2)
  })
})
