import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'
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
  /* A horizontal bar chart runs its categories down the box, so resolving every
     reading from x reports the slot the middle of the box falls in however far
     the pointer moves: measured on four rows, all four reported the third. That
     reads as a tooltip that will not follow, and is a tooltip reading the wrong
     axis. */
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

  /* A donut's slices and a heatmap's cells hear the pointer themselves, and
     heard unfiltered a touch opened the bubble under the finger. They ask this. */
  test('is refused by the same rule wherever a chart hears the pointer itself', () => {
    const one = scene(4)
    const event = (pointerType: string) => new PointerEvent('pointerenter', { pointerType })
    expect(['mouse', 'pen', 'touch', ''].map((type) => one.point.accepts(event(type)))).toEqual([
      true,
      true,
      false,
      false,
    ])
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

describe('a plot that was replaced', () => {
  /* Every chart renders a different template for its empty state, so the plot
     a pointer crossed before the table filled is a node Lit has since replaced.
     Held forever, the controller measures a detached box for the life of the
     page and the tooltip never appears. */
  test('is looked up again, rather than measured where it used to be', () => {
    const one = scene(4)
    move(one, 121, 100)
    expect(one.point.at).toBe(2)
    const root = one.host.shadowRoot as ShadowRoot
    root.querySelector('[part="plot"]')?.remove()
    const plot = document.createElement('div')
    plot.setAttribute('part', 'plot')
    plot.getBoundingClientRect = (() => ({
      bottom: 150,
      height: 100,
      left: 220,
      right: 420,
      top: 50,
      width: 200,
    })) as never
    root.append(plot)
    move(one, 221, 100)
    expect(one.point.at).toBe(0)
  })

  test('and one that has not come back yet resolves nothing', () => {
    const one = scene(4)
    move(one, 121, 100)
    one.host.shadowRoot?.querySelector('[part="plot"]')?.remove()
    one.host.dispatchEvent(new Event('pointerleave', { bubbles: true }))
    move(one, 121, 100)
    expect(one.point.at).toBe(-1)
  })
})

/* The keyboard moves the same reading the pointer does, so the tooltip and the
   readout follow it with nothing of their own to keep in step. The plot takes
   focus, and the keys are heard only from it. */
interface Keyed extends Scene {
  plot: HTMLElement
  press: (key: string) => KeyboardEvent
}

const keyed = (
  readings: number,
  options: {
    columns?: number[]
    seriesOf?: (cell: number) => number | undefined
    showsColumn?: (cell: number) => boolean
    showsReading?: (at: number) => boolean
  } = {},
): Keyed => {
  const one = scene(readings) as Keyed
  const root = one.host.shadowRoot as ShadowRoot
  const plot = root.querySelector('[part="plot"]') as HTMLElement
  plot.id = 'helix-chart-plot'
  plot.tabIndex = 0
  Object.assign(one.host, {
    plottedColumns: options.columns ?? [0],
    seriesOf: options.seriesOf ?? ((cell: number) => cell + 1),
    showsColumn: options.showsColumn,
    showsReading: options.showsReading,
  })
  one.plot = plot
  one.press = (key: string) => {
    const event = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      composed: true,
      key,
    })
    plot.dispatchEvent(event)
    return event
  }
  return one
}

describe('a reader on the keyboard', () => {
  test('starts at the first reading on the arrow that moves on, and walks from there', () => {
    const one = keyed(4)
    one.press('ArrowRight')
    expect([one.point.at, one.point.keyed]).toEqual([0, true])
    one.press('ArrowRight')
    one.press('ArrowRight')
    expect(one.point.at).toBe(2)
    one.press('ArrowLeft')
    expect(one.point.at).toBe(1)
  })

  test('and at the last on the arrow that moves back', () => {
    const one = keyed(4)
    one.press('ArrowLeft')
    expect(one.point.at).toBe(3)
  })

  test('never walks off either end', () => {
    const one = keyed(3)
    for (const key of ['ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowRight']) {
      one.press(key)
    }
    expect(one.point.at).toBe(2)
  })

  test('goes to the first and the last with Home and End', () => {
    const one = keyed(5)
    one.press('End')
    expect(one.point.at).toBe(4)
    one.press('Home')
    expect(one.point.at).toBe(0)
  })

  /* A key the chart answered must not also scroll the page under it. */
  test('takes the key from the page', () => {
    const one = keyed(4)
    expect(one.press('ArrowDown').defaultPrevented).toBe(true)
    expect(one.press('Tab').defaultPrevented).toBe(false)
  })

  test('puts the reading away with Escape', () => {
    const one = keyed(4)
    one.press('ArrowRight')
    one.press('Escape')
    expect([one.point.at, one.point.keyed]).toEqual([-1, false])
  })

  /* A key pressed in a donut's middle, which a consumer can fill with a link,
     is that link's and not the chart's. */
  test('is heard from the plot and from nothing else in the chart', () => {
    const one = keyed(4)
    const link = document.createElement('a')
    ;(one.host.shadowRoot as ShadowRoot).append(link)
    link.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, composed: true, key: 'End' }))
    expect(one.point.at).toBe(-1)
  })

  test('leaves a chord with a modifier to the page', () => {
    const one = keyed(4)
    const event = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      composed: true,
      ctrlKey: true,
      key: 'End',
    })
    one.plot.dispatchEvent(event)
    expect([one.point.at, event.defaultPrevented]).toEqual([-1, false])
  })
})

describe('a reading a legend hid', () => {
  /* A ring's slices are its rows, and a slice a legend hid is closed over. */
  test('is passed over by the arrows, Home and End', () => {
    const one = keyed(4, { showsReading: (at) => at !== 0 && at !== 2 })
    one.press('ArrowRight')
    expect(one.point.at).toBe(1)
    one.press('ArrowRight')
    expect(one.point.at).toBe(3)
    one.press('Home')
    expect(one.point.at).toBe(1)
    one.press('ArrowLeft')
    expect(one.point.at).toBe(1)
  })

  test('and is not where a reader arriving by key starts', () => {
    const one = keyed(3, { showsReading: (at) => at > 0 })
    one.plot.matches = (() => true) as never
    one.plot.dispatchEvent(new FocusEvent('focusin', { bubbles: true, composed: true }))
    expect(one.point.at).toBe(1)
  })
})

describe('the series of a reading', () => {
  /* The up and down arrows walk the bubble's list, which is the table's
     columns, and the readout then says the one cell. Up from the first goes
     back to the whole reading. */
  test('are walked with the other pair of arrows, where there are two or more', () => {
    const one = keyed(4, { columns: [0, 2] })
    one.press('ArrowRight')
    expect(one.point.column).toBeUndefined()
    one.press('ArrowDown')
    expect([one.point.at, one.point.column]).toEqual([0, 0])
    one.press('ArrowDown')
    expect(one.point.column).toBe(2)
    one.press('ArrowDown')
    expect(one.point.column).toBe(2)
    one.press('ArrowUp')
    one.press('ArrowUp')
    expect(one.point.column).toBeUndefined()
  })

  /* A scatter's first numeric column is its measure across and no series. */
  test('skip a column no series was drawn from', () => {
    const one = keyed(4, { columns: [0, 1, 2], seriesOf: (cell) => (cell < 1 ? undefined : cell) })
    one.press('ArrowDown')
    expect(one.point.column).toBe(1)
  })

  /* A series a legend hid is not drawn, so a key resting on it would say a
     reading nobody can see. */
  test('pass over a series a legend hid', () => {
    const one = keyed(4, { columns: [0, 1, 2], showsColumn: (cell) => cell !== 0 })
    one.press('ArrowDown')
    expect(one.point.column).toBe(1)
    one.press('ArrowDown')
    expect(one.point.column).toBe(2)
    expect([one.point.shows(0), one.point.shows(1)]).toEqual([false, true])
  })

  test('and with one series, the up and down arrows walk the readings too', () => {
    const one = keyed(4)
    one.press('ArrowDown')
    one.press('ArrowDown')
    expect([one.point.at, one.point.column]).toEqual([1, undefined])
  })

  /* A horizontal bar chart runs its categories down the box, so the arrows
     trade places: up and down walk the categories, the across pair the series. */
  test('trade arrows with the readings on a chart that runs down the box', () => {
    const one = keyed(4, { columns: [0, 1] })
    one.point.axis = 'block'
    one.press('ArrowDown')
    one.press('ArrowDown')
    expect(one.point.at).toBe(1)
    one.press('ArrowRight')
    expect(one.point.column).toBe(0)
  })
})

describe('a grid of readings', () => {
  /* A heatmap stands a week to a column, so the across arrows move a week. */
  test('moves a column across and a reading up and down', () => {
    const one = keyed(21)
    one.point.grid = 7
    one.press('Home')
    one.press('ArrowRight')
    expect(one.point.at).toBe(7)
    one.press('ArrowDown')
    expect(one.point.at).toBe(8)
    one.press('ArrowLeft')
    expect(one.point.at).toBe(1)
  })
})

describe('the keyboard and the pointer together', () => {
  test('a pointer moving takes the reading back, and the readout goes quiet', () => {
    const one = keyed(4)
    one.press('End')
    move(one, 21, 100)
    expect([one.point.at, one.point.keyed]).toEqual([0, false])
  })

  /* A reader who nudged the mouse while reading by key keeps their place. */
  test('a pointer leaving keeps a reading the keys chose', () => {
    const one = keyed(4)
    one.press('End')
    one.host.dispatchEvent(new Event('pointerleave'))
    expect(one.point.at).toBe(3)
  })

  test('leaving the plot puts a reading the keys chose away', () => {
    const one = keyed(4)
    one.press('End')
    one.plot.dispatchEvent(new FocusEvent('focusout', { bubbles: true, composed: true }))
    expect([one.point.at, one.point.keyed]).toEqual([-1, false])
  })

  /* `:focus-visible` is how the platform says a key brought focus. happy-dom
     does not answer it, so the plot answers for it here. */
  const arrive = (one: Keyed, byKey: boolean): void => {
    one.plot.matches = ((selector: string) => byKey && selector === ':focus-visible') as never
    one.plot.dispatchEvent(new FocusEvent('focusin', { bubbles: true, composed: true }))
  }

  test('arriving at the plot by key shows the first reading', () => {
    const one = keyed(4)
    arrive(one, true)
    expect([one.point.at, one.point.keyed]).toEqual([0, true])
  })

  test('and a press of the pointer that focuses it shows nothing of its own', () => {
    const one = keyed(4)
    arrive(one, false)
    expect(one.point.at).toBe(-1)
  })
})

describe('a page of readings by key', () => {
  test('is a tenth of a row of readings, and four columns of a grid', () => {
    const row = keyed(40)
    row.press('Home')
    row.press('PageDown')
    expect(row.point.at).toBe(4)
    const grid = keyed(70)
    grid.point.grid = 7
    grid.press('Home')
    grid.press('PageDown')
    expect(grid.point.at).toBe(28)
    grid.press('PageUp')
    expect(grid.point.at).toBe(0)
  })
})
