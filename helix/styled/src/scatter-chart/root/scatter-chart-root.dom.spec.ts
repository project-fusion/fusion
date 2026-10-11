import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

/* Where the numbers land against the drawing, and what a pointer finds. Every
   claim is about a box. Run them with `bun run specs:browser scatter-chart`. */

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

const geometry = hasLayout() ? test : (): void => {}

const TABLE = `<table id="pages" data-hidden-visually>
  <caption>Page weight and load time</caption>
  <thead><tr><th scope="col">Page</th><th scope="col">Weight (KB)</th><th scope="col">Load time (ms)</th></tr></thead>
  <tbody>
    <tr><th scope="row">Home</th><td data-value="820">820</td><td data-value="1240">1,240</td></tr>
    <tr><th scope="row">Docs</th><td data-value="1180">1,180</td><td data-value="1710">1,710</td></tr>
    <tr><th scope="row">Status</th><td data-value="290">290</td><td data-value="520">520</td></tr>
    <tr><th scope="row">Blog</th><td data-value="1450">1,450</td><td data-value="2050">2,050</td></tr>
  </tbody>
</table>`

type Chart = HTMLElement & { updateComplete: Promise<unknown> }

const frames = async (host: Chart): Promise<void> => {
  for (let pass = 0; pass < 3; pass++) {
    await new Promise((resolve) => requestAnimationFrame(resolve))
    await host.updateComplete
  }
}

const chart = async (): Promise<Chart> => {
  await mount(
    `<div style="inline-size: 32rem">${TABLE}<helix-scatter-chart for="pages" gridlines></helix-scatter-chart></div>`,
  )
  const host = document.querySelector('helix-scatter-chart') as Chart
  await frames(host)
  return host
}

const all = (host: HTMLElement, name: string): HTMLElement[] => [
  ...(host.shadowRoot?.querySelectorAll<HTMLElement>(`[part~="${name}"]`) ?? []),
]
const middle = (element: Element): { x: number; y: number } => {
  const box = element.getBoundingClientRect()
  return { x: box.left + box.width / 2, y: box.top + box.height / 2 }
}

/** Where each point is drawn on the page, in the order drawn, from the strokes of no length in its paths. */
const places = (host: HTMLElement): Array<{ x: number; y: number }> => {
  const plot = (part(host, 'plot') as HTMLElement).getBoundingClientRect()
  return all(host, 'point').flatMap((path) =>
    [...(path.getAttribute('d') ?? '').matchAll(/M([^,]+),([^h]+)h0/g)].map((dot) => ({
      x: plot.left + (Number(dot[1]) / 100) * plot.width,
      y: plot.top + (Number(dot[2]) / 100) * plot.height,
    })),
  )
}

describe('the axes', () => {
  geometry('label each level up at the height of its rule', async () => {
    const host = await chart()
    const rules = all(host, 'gridline')
      .filter((line) => line.getAttribute('y1') === line.getAttribute('y2'))
      .map((line) => line.getBoundingClientRect().top)
      .sort((a, b) => a - b)
    const labels = all(host, 'y-tick')
      .map((tick) => middle(tick).y)
      .sort((a, b) => a - b)
    expect(labels).toHaveLength(rules.length)
    labels.forEach((y, index) => {
      expect(Math.abs(y - (rules[index] ?? 0))).toBeLessThan(2)
    })
  })

  geometry('label each level across under its rule', async () => {
    const host = await chart()
    const rules = all(host, 'gridline')
      .filter((line) => line.getAttribute('x1') === line.getAttribute('x2'))
      .map((line) => line.getBoundingClientRect().left)
      .sort((a, b) => a - b)
    /* The one at the far edge ends at its rule, and every other is centered. */
    const labels = all(host, 'x-tick')
      .map((tick) =>
        tick.dataset.edge === 'end' ? tick.getBoundingClientRect().right : middle(tick).x,
      )
      .sort((a, b) => a - b)
    expect(labels).toHaveLength(rules.length)
    labels.forEach((x, index) => {
      expect(Math.abs(x - (rules[index] ?? 0))).toBeLessThan(2)
    })
  })

  /* Centered on the plot's right edge, the last number hung half past the
     chart, and a box around it cut it off. */
  geometry('keep the last label across inside the chart', async () => {
    const host = await chart()
    const last = all(host, 'x-tick').at(-1) as HTMLElement
    expect(last.getBoundingClientRect().right).toBeLessThanOrEqual(
      host.getBoundingClientRect().right + 0.5,
    )
  })

  geometry('keep the labels up beside the plot, not over it', async () => {
    const host = await chart()
    const plot = (part(host, 'plot') as HTMLElement).getBoundingClientRect()
    for (const tick of all(host, 'y-tick')) {
      expect(tick.getBoundingClientRect().right).toBeLessThanOrEqual(plot.left + 1)
    }
  })

  geometry('say what they measure, and nothing in the summary shows', async () => {
    const host = await chart()
    expect(part(host, 'x-name')?.textContent).toBe('Weight (KB)')
    const summary = (part(host, 'summary') as HTMLElement).getBoundingClientRect()
    expect(summary.width).toBeLessThanOrEqual(1)
    expect(summary.height).toBeLessThanOrEqual(1)
  })
})

describe('a pointer', () => {
  const move = (host: HTMLElement, x: number, y: number): void => {
    host.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        clientX: x,
        clientY: y,
        composed: true,
        pointerType: 'mouse',
      }),
    )
  }

  geometry('near a point asks about its row, and marks it', async () => {
    const host = await chart()
    const { x, y } = places(host)[1] as { x: number; y: number }
    move(host, x + 6, y - 4)
    await frames(host)
    expect(part(host, 'tooltip-label')?.textContent).toBe('Docs')
    const marked = all(host, 'point-active')
    expect(marked).toHaveLength(1)
    const at = middle(marked[0] as HTMLElement)
    expect(Math.hypot(at.x - x, at.y - y)).toBeLessThan(1)
  })

  geometry('far from every point asks about nothing', async () => {
    const host = await chart()
    const plot = (part(host, 'plot') as HTMLElement).getBoundingClientRect()
    move(host, plot.left + 2, plot.top + 2)
    await frames(host)
    expect(all(host, 'point-active')).toHaveLength(0)
    expect(part(host, 'tooltip-label')).toBeNull()
  })

  /* Every point was measured against the pointer on every move. Laid out on a
     grid of 200 across and 100 up, the points stand a few pixels apart.

     **Eight seconds, where every other spec has the harness's two.** This one
     waits on twelve frames with 20,000 points drawn. On a desk it takes about
     240 milliseconds in Chromium and 290 in WebKit, measured October 11, 2026,
     and in WebKit on a two-core runner it ran past two seconds on run
     38117810000, where the whole family took 3.8 seconds against Chromium's
     1.9. */
  geometry(
    'finds the nearest of 20,000 points',
    async () => {
      await mount(
        '<div style="inline-size: 32rem"><helix-scatter-chart label="Grid"></helix-scatter-chart></div>',
      )
      const host = document.querySelector('helix-scatter-chart') as Chart & { data: unknown }
      host.data = {
        columns: ['Row', 'Across', 'Up'],
        rows: Array.from({ length: 20_000 }, (_, at) => [`r${at}`, at % 200, Math.floor(at / 200)]),
      }
      await frames(host)
      const plot = (part(host, 'plot') as HTMLElement).getBoundingClientRect()
      /* Across runs 0 to 200 and up 0 to 100, the round numbers around them. */
      for (const row of [0, 7_431, 19_999]) {
        move(
          host,
          plot.left + ((row % 200) / 200) * plot.width,
          plot.top + (1 - Math.floor(row / 200) / 100) * plot.height,
        )
        await frames(host)
        expect(part(host, 'tooltip-label')?.textContent).toBe(`r${row}`)
      }
    },
    8000,
  )
})

/* A series' points were an element each, so two that overlapped darkened
   where they met. In one path they would be one shape, so overlapping points
   stand in separate groups, and the group takes the opacity. */
describe('points that overlap', () => {
  geometry('stand in separate groups, each at the opacity of a point', async () => {
    await mount(
      `<div style="inline-size: 32rem"><table id="twins" data-hidden-visually><tbody>
        <tr><th>A</th><td>10</td><td>10</td></tr>
        <tr><th>B</th><td>10.2</td><td>10</td></tr>
        <tr><th>C</th><td>90</td><td>90</td></tr>
      </tbody></table><helix-scatter-chart for="twins"></helix-scatter-chart></div>`,
    )
    const host = document.querySelector('helix-scatter-chart') as Chart
    await frames(host)
    const groups = all(host, 'points')
    expect(groups).toHaveLength(2)
    const counts = groups.map(
      (group) =>
        (group.querySelector('[part="point"]')?.getAttribute('d')?.match(/h0/g) ?? []).length,
    )
    expect(counts).toEqual([2, 1])
    expect(groups.map((group) => getComputedStyle(group).opacity)).toEqual(['0.8', '0.8'])
  })
})

/**
 * The plane on a right-to-left page.
 *
 * **Laid out as on a left-to-right one.** A measure runs left to right in every
 * script, as a number line does, so the y axis stays on the left and more stays
 * to the right. Mirrored with the bar and line charts, it put the levels up on
 * the right and ran the levels across from 1,600 down to 200. Set on the root,
 * as a page would set it.
 */
describe('on a right-to-left page', () => {
  afterEach(() => {
    document.documentElement.removeAttribute('dir')
  })

  const PLANE = ['plot', 'point', 'gridline', 'x-tick', 'y-tick', 'x-name', 'y-name']

  /** Every box in the plane, from the host's own left edge. */
  const layout = async (): Promise<number[]> => {
    const host = await chart()
    const origin = host.getBoundingClientRect().left
    return PLANE.flatMap((name) =>
      all(host, name).map((one) => one.getBoundingClientRect().left - origin),
    )
  }

  geometry('everything in the plane is where a left-to-right page puts it', async () => {
    const ltr = await layout()
    document.documentElement.dir = 'rtl'
    const rtl = await layout()
    expect(rtl).toHaveLength(ltr.length)
    rtl.forEach((left, index) => {
      expect(Math.abs(left - (ltr[index] ?? 0))).toBeLessThan(1)
    })
  })

  geometry('the levels up are left of the plot, and more is to the right', async () => {
    document.documentElement.dir = 'rtl'
    const host = await chart()
    const plot = (part(host, 'plot') as HTMLElement).getBoundingClientRect()
    for (const tick of all(host, 'y-tick')) {
      expect(tick.getBoundingClientRect().right).toBeLessThanOrEqual(plot.left + 1)
    }
    const levels = all(host, 'x-tick')
      .sort((a, b) => middle(a).x - middle(b).x)
      .map((tick) => Number(tick.textContent?.replaceAll(',', '')))
    expect(levels).toEqual([...levels].sort((a, b) => a - b))
    // Status is the lightest page and Blog the heaviest.
    const across = places(host).map((one) => one.x)
    expect(Math.min(...across)).toBe(across[2] as number)
    expect(Math.max(...across)).toBe(across[3] as number)
  })

  geometry('a pointer near a point asks about its row, and is answered over it', async () => {
    document.documentElement.dir = 'rtl'
    const host = await chart()
    const { x, y } = places(host)[1] as { x: number; y: number }
    host.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        clientX: x + 6,
        clientY: y - 4,
        composed: true,
        pointerType: 'mouse',
      }),
    )
    await frames(host)
    expect(all(host, 'point-active')).toHaveLength(1)
    expect(part(host, 'tooltip-label')?.textContent).toBe('Docs')
    const mark = (part(host, 'mark') as HTMLElement).getBoundingClientRect()
    expect(Math.abs(mark.left - x)).toBeLessThan(2)
  })

  /* The names and the bubble are words, so they read the page's way. The
     plane's `dir` would otherwise reach the bubble, which sits inside it. */
  geometry('the bubble and the summary read the way the page does', async () => {
    document.documentElement.dir = 'rtl'
    const host = await chart()
    const docs = places(host)[1] as { x: number; y: number }
    host.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        clientX: docs.x,
        clientY: docs.y,
        composed: true,
        pointerType: 'mouse',
      }),
    )
    await frames(host)
    const bubble = part(host, 'tooltip-anchor') as HTMLElement
    expect(getComputedStyle(bubble).direction).toBe('rtl')
    expect(getComputedStyle(part(host, 'summary') as HTMLElement).direction).toBe('rtl')
    expect(getComputedStyle(part(host, 'plot') as HTMLElement).direction).toBe('ltr')
  })
})
