import {
  HelixPlotChangeEvent,
  HelixPlotTurnEvent,
  type PlotTurnDetail,
  reportRuntime,
  rgbOf,
  watchTheme,
} from '@fusion.dev/helix-core'

/** One axis of a plot: its column's name, its range, and the ticks on it. */
export interface Axis {
  name: string
  range: readonly [number, number]
  ticks: readonly number[]
}

/** A plot's three axes: across, up, and in depth. */
export interface Axes {
  readonly x: Axis
  readonly y: Axis
  readonly z: Axis
}

/** The colors a plot is drawn in, each `rgb()`, read from the page's tokens where the chart is. */
export interface PlotColors {
  /** The box's edges and grid lines: `border`. */
  grid: string
  /** What the drawing is laid on: `surface-sunken`. */
  ground: string
  /** One color for each group, in the order of the groups: `--chart-series-1` and on. */
  groups: string[]
  /** The names and the ring on what the keys rest on: `foreground`. */
  ink: string
  /** The ticks' numbers: `foreground-muted`. */
  quiet: string
  /**
   * The ramp a height is shaded along, from `--spatial-surface-chart-low` to
   * `--spatial-surface-chart-high`: a quiet tint of `primary-active` up to it whole.
   */
  ramp: { high: string; low: string }
}

/**
 * What a renderer has to answer for a 3D chart to drive it, and nothing that
 * is the same for every renderer: that is the connector's.
 */
export interface PlotDriver<F> {
  /** Draws the chart's field and the axes, replacing whatever was drawn. */
  draw(field: F, colors: PlotColors, font: string): void
  /** Marks the reading at `index` as the one the keys rest on, or none with `-1`. */
  focus(index: number): void
  /**
   * Calls `press` with a reading's index when the reader presses it in the
   * drawing, and with `-1` when they press where none is. Returns what stops
   * listening.
   */
  onPress?(press: (index: number) => void): () => void
  /** Turns the view by steps across and up, over a short animation or at once. */
  turnBy(across: number, up: number, animate: boolean): void
  /** Removes whatever the driver added to the page, and frees its renderer. */
  stop?(): void
}

/** A connection, which is ended rather than left to leak. */
export interface PlotConnection {
  /** Stops answering the chart, frees the renderer, and shows the chart's flat drawing again. */
  disconnect(): void
  /**
   * Reads the page's colors again. The connection hears a theme that changes
   * by a class, a mode, or the reader's preference on its own; call this
   * after replacing a stylesheet, which no attribute shows.
   */
  restyle(): void
}

/** A 3D chart as a connector reads it. */
interface Chart<F> extends HTMLElement {
  active?: number
  drawn?(on?: boolean): void
  field?: F
  requestActive?(index: number): void
  updateComplete?: Promise<unknown>
}

/** How many series colors the palette has, after which the groups take them again. */
const SERIES = 24

/** Whether the page asks for movement to be kept to a minimum. */
const still = (): boolean =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * The page's colors where the chart is, or `null` while they cannot be read.
 *
 * **Settled by the browser and read back as `rgb()`**, since a token is
 * `light-dark()` over a ramp, which only the browser can settle for the
 * chart's scheme, and what it settles to may be `oklch()`, which three.js
 * cannot read. Read inside the chart, so a chart in a dark region of a light
 * page is drawn dark, and from the names the chart's own sheet gives the
 * series, so a page that colors its groups colors them here too.
 */
export const plotColorsFrom = (chart: Element, groups: number): PlotColors | null => {
  if (typeof document === 'undefined') {
    return null
  }
  const probe = document.createElement('span')
  probe.style.display = 'none'
  probe.setAttribute('aria-hidden', 'true')
  chart.append(probe)
  try {
    const read = (value: string): string | null => {
      probe.style.color = ''
      probe.style.color = value
      const color = getComputedStyle(probe).color
      return color === '' ? null : rgbOf(color)
    }
    /* **A token the page lacks reads as transparent**, its fallback here, and
       is no color: asked of the property itself, an inherited one reads as
       empty in some DOMs that still resolve it inside a color. */
    const token = (name: string): string | null => {
      probe.style.color = ''
      probe.style.color = `var(--helix-color-${name}, transparent)`
      const color = getComputedStyle(probe).color.replace(/\s/g, '')
      return color === '' || color === 'transparent' || color === 'rgba(0,0,0,0)'
        ? null
        : read(`var(--helix-color-${name})`)
    }
    const [grid, ground, ink, quiet] = [
      'border',
      'surface-sunken',
      'foreground',
      'foreground-muted',
    ].map(token)
    if (!grid || !ground || !ink || !quiet) {
      return null
    }
    const colors: string[] = []
    for (let at = 0; at < Math.max(groups, 1); at++) {
      colors.push(
        read(`var(--chart-series-${(at % SERIES) + 1}, var(--helix-color-primary))`) ?? ink,
      )
    }
    const high = read('var(--spatial-surface-chart-high, var(--helix-color-primary-active))') ?? ink
    const low =
      read(
        'var(--spatial-surface-chart-low, color-mix(in oklab, var(--helix-color-primary-active) 15%, var(--helix-color-surface-sunken)))',
      ) ?? ground
    return { grid, ground, groups: colors, ink, quiet, ramp: { high, low } }
  } finally {
    probe.remove()
  }
}

/**
 * Connects a 3D chart to a driver: draws the chart's field, colors it from
 * the page's tokens, marks what the keys rest on, turns the view for Shift
 * with an arrow, and puts a reading pressed in the drawing on the chart.
 * `groupsOf` says how many group colors the field needs, and `name` is the
 * connector a misuse is reported by.
 */
export const connectPlot = <F extends object>(
  frame: HTMLElement,
  driver: PlotDriver<F>,
  options: { groupsOf: (field: F) => number; name: string; readings: (field: F) => number },
): PlotConnection => {
  const chart = frame as Chart<F>
  if (!('field' in frame) || typeof chart.requestActive !== 'function') {
    reportRuntime({
      detail: frame,
      kind: 'not-a-plot',
      message: `${options.name}: the element given is not the 3D chart it connects, so nothing will be drawn.`,
      tag: frame.localName,
    })
  }
  let connected = true

  const draw = (): void => {
    const field = chart.field
    if (!connected || !field) {
      return
    }
    const colors = plotColorsFrom(frame, options.groupsOf(field))
    if (!colors || options.readings(field) === 0) {
      chart.drawn?.(false)
      return
    }
    const font =
      getComputedStyle(frame)
        .fontFamily.split(',')[0]
        ?.trim()
        .replace(/^["']|["']$/g, '') ?? ''
    driver.draw(field, colors, font || 'sans-serif')
    driver.focus(chart.active ?? -1)
    chart.drawn?.(true)
  }

  const handleChange = (event: Event): void => {
    const { kind } = (event as HelixPlotChangeEvent).detail
    if (kind === 'data') {
      draw()
    } else {
      driver.focus(chart.active ?? -1)
    }
  }

  const handleTurn = (event: Event): void => {
    const { across, up } = (event as CustomEvent<PlotTurnDetail>).detail
    driver.turnBy(across, up, !still())
  }

  frame.addEventListener(HelixPlotChangeEvent.eventName, handleChange)
  frame.addEventListener(HelixPlotTurnEvent.eventName, handleTurn)
  const stopPress = driver.onPress?.((index) => {
    chart.requestActive?.(index)
  })
  const stopTheme = watchTheme(frame, () => {
    draw()
  })

  /* After the chart's first render, which is when it has read its table. */
  void Promise.resolve(chart.updateComplete).then(draw)

  return {
    disconnect: () => {
      connected = false
      frame.removeEventListener(HelixPlotChangeEvent.eventName, handleChange)
      frame.removeEventListener(HelixPlotTurnEvent.eventName, handleTurn)
      stopPress?.()
      stopTheme()
      driver.stop?.()
      chart.drawn?.(false)
    },
    restyle: draw,
  }
}
