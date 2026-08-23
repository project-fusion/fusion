import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@helix-io/testing/dom'
import { ChartPointerController } from './chart-pointer-controller.js'

/**
 * Which reading a pointer is nearest, for a chart that draws no markers.
 *
 * **The anchor is a position and not an element, which is the whole reason this
 * exists.** A bar and a donut slice are elements a tooltip could be hung on; a
 * line is one `<path>` for a whole series, because `preserveAspectRatio="none"`
 * turns a circle into an ellipse and no vector-effect answers for a shape, so
 * `LineChart` deliberately draws no per-reading marker. Anchoring per datum
 * works for two charts of four and cannot be extended to the third, so the
 * resolution is arithmetic instead.
 *
 * The plot's box is supplied, as everywhere else that reads layout here: the
 * arithmetic between a pointer and a rectangle is the subject, and happy-dom
 * has no rectangles.
 */
beforeAll(() => {
  registerDom()
})

interface Scene {
  host: HTMLElement
  point: ChartPointerController
  updates: number
}

const PLOT = { height: 100, left: 20, top: 50, width: 200 }

const scene = (readings: number, box: Partial<typeof PLOT> = {}): Scene => {
  document.body.innerHTML = '<div id="chart"></div>'
  const host = document.getElementById('chart') as HTMLElement
  const root = host.attachShadow({ mode: 'open' })
  root.innerHTML = '<div part="plot"></div><span part="tooltip-anchor"></span>'
  const plot = root.querySelector('[part="plot"]') as HTMLElement
  const { height, left, top, width } = { ...PLOT, ...box }
  plot.getBoundingClientRect = (() => ({
    bottom: top + height,
    height,
    left,
    right: left + width,
    top,
    width,
  })) as never
  const made = { host, updates: 0 } as Scene
  /* `renderRoot` and not `shadowRoot`: the controller looks for the plot where
     Lit rendered, which is the same node here and a different property. */
  Object.assign(host, {
    addController: () => {},
    readings,
    renderRoot: root,
    requestUpdate: () => {
      made.updates += 1
    },
  })
  made.point = new ChartPointerController(host as never)
  made.point.hostConnected()
  return made
}

/** A pointer at a point in the plot, fine unless something coarser is named. */
const move = (one: Scene, x: number, y: number, pointerType = 'mouse'): void => {
  const event = new Event('pointermove', { bubbles: true })
  Object.assign(event, { clientX: x, clientY: y, pointerType })
  one.host.dispatchEvent(event)
}

describe('a pointer moving across a chart', () => {
  /* The same slot arithmetic the charts draw with: reading `i` sits in the
     middle of the `i`th of `count` equal slots, so the nearest is the slot the
     pointer is in. Rounding a proportion of `count - 1` instead puts the
     boundaries half a slot off, and the first and last reading get half the
     catchment of the others. */
  test('lands on the reading whose slot it is in', () => {
    const one = scene(4)
    for (const [x, expected] of [
      [21, 0],
      [69, 0],
      [71, 1],
      [121, 2],
      [219, 3],
    ] as const) {
      move(one, x, 100)
      expect(one.point.at).toBe(expected)
    }
  })

  test('and the two ends get a whole slot each, not half of one', () => {
    const one = scene(4)
    move(one, 20, 100)
    expect(one.point.at).toBe(0)
    move(one, 219, 100)
    expect(one.point.at).toBe(3)
  })

  test('never off either end, whatever the pointer does', () => {
    const one = scene(4)
    move(one, -400, 100)
    expect(one.point.at).toBe(0)
    move(one, 4000, 100)
    expect(one.point.at).toBe(3)
  })

  /* Decided by one axis alone, because a reader moving across a chart is asking
     about a column of it rather than about a point. A true nearest-point search
     would make a two-series chart answer differently depending on which line the
     pointer drifted toward, which is a tooltip that changes its mind while the
     reader holds still. */
  test('whatever the other axis is doing', () => {
    const one = scene(4)
    move(one, 121, 51)
    expect(one.point.at).toBe(2)
    move(one, 121, 149)
    expect(one.point.at).toBe(2)
  })
})

describe('a chart whose categories run down the box', () => {
  /* This was `tracks = true` and every reading was resolved from x whatever the
     chart was doing. A horizontal bar chart runs its categories down, so moving
     the pointer from the first row to the last never changed the answer:
     measured on four rows, all four reported the third, which is the slot the
     middle of the box falls in. It looked like a tooltip that would not follow
     and was a tooltip reading the wrong axis. */
  test('is read down the box, not across it', () => {
    const one = scene(4)
    one.point.axis = 'block'
    move(one, 120, 51)
    expect(one.point.at).toBe(0)
    move(one, 120, 149)
    expect(one.point.at).toBe(3)
  })

  test('and x says nothing about it', () => {
    const one = scene(4)
    one.point.axis = 'block'
    move(one, 21, 76)
    expect(one.point.at).toBe(1)
    move(one, 219, 76)
    expect(one.point.at).toBe(1)
  })
})

describe('a ring', () => {
  /* Its slices are real elements at every angle, so the reading under the
     pointer is the one the pointer is over. Arithmetic on either axis would
     answer with whichever slice shared a coordinate: at three o'clock and at
     nine o'clock, x alone gives the same slice for opposite sides. */
  test('resolves nothing by arithmetic, since its slices are elements', () => {
    const one = scene(4)
    one.point.axis = 'none'
    move(one, 219, 100)
    expect(one.point.at).toBe(-1)
  })

  test('and the slices say which one instead', () => {
    const one = scene(4)
    one.point.axis = 'none'
    one.point.set(2)
    expect([one.point.at, one.updates]).toEqual([2, 1])
  })

  test('once per reading, rather than on every press of the same one', () => {
    const one = scene(4)
    one.point.set(2)
    one.point.set(2)
    expect(one.updates).toBe(1)
  })
})

describe('a coarse pointer', () => {
  /* A touch has no hover, so a tooltip driven by one appears where a finger
     already covers it and stays after the finger lifts. The table underneath is
     the readable version and is what a phone should be given. */
  test('gets nothing, because the table underneath is the readable version', () => {
    const one = scene(4)
    move(one, 121, 100, 'touch')
    expect(one.point.at).toBe(-1)
  })

  test('while a pen is fine, being a hover the reader can see past', () => {
    const one = scene(4)
    move(one, 121, 100, 'pen')
    expect(one.point.at).toBe(2)
  })
})

describe('a chart with nothing in it', () => {
  test('resolves nothing rather than dividing by its own emptiness', () => {
    const one = scene(0)
    move(one, 121, 100)
    expect(one.point.at).toBe(-1)
  })

  test('nor one whose plot has no box yet', () => {
    document.body.innerHTML = '<div id="chart"></div>'
    const host = document.getElementById('chart') as HTMLElement
    host.attachShadow({ mode: 'open' }).innerHTML = '<span></span>'
    Object.assign(host, {
      addController: () => {},
      readings: 4,
      renderRoot: host.shadowRoot,
      requestUpdate: () => {},
    })
    const point = new ChartPointerController(host as never)
    point.hostConnected()
    const event = new Event('pointermove', { bubbles: true })
    Object.assign(event, { clientX: 10, clientY: 10, pointerType: 'mouse' })
    expect(() => {
      host.dispatchEvent(event)
    }).not.toThrow()
    expect(point.at).toBe(-1)
  })
})

describe('the pointer leaving', () => {
  test('takes the reading with it', () => {
    const one = scene(4)
    move(one, 121, 100)
    one.host.dispatchEvent(new Event('pointerleave', { bubbles: true }))
    expect(one.point.at).toBe(-1)
  })

  test('and asks for nothing where there was no reading to lose', () => {
    const one = scene(4)
    one.host.dispatchEvent(new Event('pointerleave', { bubbles: true }))
    expect(one.updates).toBe(0)
  })
})

describe('telling the tooltip its anchor moved', () => {
  /* The mark is one element the chart walks from reading to reading with an
     inline style, and Floating UI's `autoUpdate` watches scrolling, resizing
     and layout shift. Moving an absolutely positioned element by writing
     `inset` is none of the three, so the bubble is placed once on open and then
     stays where the first reading was while the mark travels out from under
     it. */
  test('happens after the update, when the mark is where it is going', () => {
    const one = scene(4)
    const anchor = one.host.shadowRoot?.querySelector('[part="tooltip-anchor"]') as HTMLElement
    let placed = 0
    Object.assign(anchor, {
      reposition: () => {
        placed += 1
      },
    })
    move(one, 121, 100)
    one.point.hostUpdated()
    expect(placed).toBe(1)
  })

  test('and not on an update that moved nothing', () => {
    const one = scene(4)
    const anchor = one.host.shadowRoot?.querySelector('[part="tooltip-anchor"]') as HTMLElement
    let placed = 0
    Object.assign(anchor, {
      reposition: () => {
        placed += 1
      },
    })
    one.point.hostUpdated()
    expect(placed).toBe(0)
  })

  /* A chart whose tooltip has not rendered yet, which is every chart before the
     pointer has ever been on it. */
  test('and asks nothing of an anchor that is not there', () => {
    const one = scene(4)
    one.host.shadowRoot?.querySelector('[part="tooltip-anchor"]')?.remove()
    move(one, 121, 100)
    expect(() => {
      one.point.hostUpdated()
    }).not.toThrow()
  })
})

describe('a host that has left', () => {
  test('stops following the pointer, and holds no reading', () => {
    const one = scene(4)
    move(one, 121, 100)
    one.point.hostDisconnected()
    move(one, 21, 100)
    expect(one.point.at).toBe(-1)
  })
})
