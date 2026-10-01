import { readColor } from '@fusion.dev/helix-core'

/**
 * The colors a graph is drawn in, each `rgb()`, read from the page's tokens
 * where the frame is.
 */
export interface GraphColors {
  /** What the drawing is laid on, which faded notes are mixed toward: `surface-sunken`. */
  ground: string
  /** The links: `border`. */
  line: string
  /** The labels: `foreground`. */
  ink: string
  /** A note in no group, and the links that touch the selected note: `foreground-muted`. */
  muted: string
  /** What a note's name is drawn on while the pointer is over it: `surface-overlay`. */
  overlay: string
  /** The selected note: `primary`. */
  primary: string
  /** One color for each group, in the order of the groups' names: `series-1` and on. */
  series: string[]
}

/** How many of the series tokens a graph reads. */
const SERIES = 24

/** The Helix token each color is read from. */
const TOKENS = {
  ground: '--helix-color-surface-sunken',
  ink: '--helix-color-foreground',
  line: '--helix-color-border',
  muted: '--helix-color-foreground-muted',
  overlay: '--helix-color-surface-overlay',
  primary: '--helix-color-primary',
} as const

/**
 * The page's colors where the frame is, or `null` while they cannot be read.
 *
 * **Settled by the browser and read back as `rgb()`**, because a token is not
 * a color yet: it is `light-dark()` over a ramp, which only the browser can
 * settle for the frame's scheme, and what it settles to may be `oklch()`,
 * which a WebGL renderer cannot parse. Read inside the frame, so a graph in a
 * dark region of a light page is drawn dark.
 *
 * **Not yet rather than never.** A stylesheet being swapped takes the tokens
 * away for a moment, which is `null` here, and the connector asks again on the
 * next change.
 */
export const graphColorsFrom = (element: Element): GraphColors | null => {
  if (typeof document === 'undefined') {
    return null
  }
  const probe = document.createElement('span')
  probe.style.display = 'none'
  probe.setAttribute('aria-hidden', 'true')
  element.append(probe)
  try {
    const read = (token: string): string | null => {
      if (getComputedStyle(probe).getPropertyValue(token).trim() === '') {
        return null
      }
      probe.style.color = `var(${token})`
      const bytes = readColor(getComputedStyle(probe).color)
      return bytes ? `rgb(${bytes[0]}, ${bytes[1]}, ${bytes[2]})` : null
    }
    const named = Object.fromEntries(
      Object.entries(TOKENS).map(([name, token]) => [name, read(token)]),
    ) as Record<keyof typeof TOKENS, string | null>
    if (Object.values(named).some((one) => one === null)) {
      return null
    }
    const series: string[] = []
    for (let at = 1; at <= SERIES; at++) {
      const one = read(`--helix-color-series-${at}`)
      if (one === null) {
        break
      }
      series.push(one)
    }
    return { ...(named as Record<keyof typeof TOKENS, string>), series }
  } finally {
    probe.remove()
  }
}

/** One `rgb()` moved toward another by `amount`, from 0 to 1. */
export const mixRgb = (from: string, to: string, amount: number): string => {
  const parts = (value: string): number[] => value.match(/[\d.]+/g)?.map(Number) ?? [0, 0, 0]
  const [one, other] = [parts(from), parts(to)]
  const channel = (at: number): number =>
    Math.round((one[at] ?? 0) + ((other[at] ?? 0) - (one[at] ?? 0)) * amount)
  return `rgb(${channel(0)}, ${channel(1)}, ${channel(2)})`
}

/** How one note is drawn. */
export interface NodeLook {
  color: string
  /** Outside the local graph that `depth` keeps. */
  hidden: boolean
  /**
   * When its name is drawn: `always`, whatever the room, as the selected
   * note's is; `room`, where it does not cover another name, as the
   * renderer decides for every note at rest; `never`, as a faded note's is.
   *
   * **The neighbors get room and not always.** Forced, a hub's twenty
   * neighbors drew their names over each other in a knot nobody could read.
   */
  label: 'always' | 'never' | 'room'
  /** Drawn over the rest, as the selected note and its neighbors are. */
  raised: boolean
  /** The selected note. */
  selected: boolean
}

/** How one link is drawn. */
export interface LinkLook {
  color: string
  hidden: boolean
  raised: boolean
}

/** How every note and link is drawn, asked one at a time, so ten thousand cost nothing until drawn. */
export interface GraphLooks {
  /** The typeface the labels are drawn in: the first of the frame's own. */
  font: string
  /** The color the labels are drawn in. */
  ink: string
  /** What a name is drawn on while the pointer is over its note. */
  overlay: string
  link(source: string, target: string): LinkLook
  node(id: string): NodeLook
}

/** How far a note outside the selected one's neighborhood is faded toward the ground. */
const FADED = 0.75

/**
 * How the graph is drawn for one selection.
 *
 * **The neighborhood stands out and the rest steps back**, which is what
 * selecting a note in a graph of thousands is for: the selected note in the
 * brand color, the notes it links to and from in their groups' colors with
 * their names drawn where there is room, and every other note faded toward
 * the ground, unnamed. With
 * nothing selected, every note is in its group's color.
 *
 * Groups take the series in the order of their names, so a group keeps its
 * color whichever notes a page loads first.
 */
export const looksOf = (options: {
  colors: GraphColors
  font?: string | undefined
  groupOf: (id: string) => string | undefined
  groups: readonly string[]
  near: ReadonlySet<string>
  selected: string | undefined
  shown: ReadonlySet<string> | undefined
}): GraphLooks => {
  const { colors, groupOf, near, selected, shown } = options
  const order = new Map([...new Set(options.groups)].sort().map((group, at) => [group, at]))
  const own = (id: string): string => {
    const group = groupOf(id)
    const at = group === undefined ? undefined : order.get(group)
    return at === undefined || colors.series.length === 0
      ? colors.muted
      : (colors.series[at % colors.series.length] as string)
  }
  const focused = selected !== undefined
  const hidden = (id: string): boolean => shown !== undefined && !shown.has(id)
  return {
    font: options.font || 'sans-serif',
    ink: colors.ink,
    link: (source, target) => {
      const touches = focused && (source === selected || target === selected)
      return {
        color: touches
          ? colors.muted
          : focused
            ? mixRgb(colors.line, colors.ground, 0.5)
            : colors.line,
        hidden: hidden(source) || hidden(target),
        raised: touches,
      }
    },
    node: (id) => {
      if (id === selected) {
        return {
          color: colors.primary,
          hidden: hidden(id),
          label: 'always',
          raised: true,
          selected: true,
        }
      }
      const neighbor = focused && near.has(id)
      return {
        color: focused && !neighbor ? mixRgb(own(id), colors.ground, FADED) : own(id),
        hidden: hidden(id),
        label: focused && !neighbor ? 'never' : 'room',
        raised: neighbor,
        selected: false,
      }
    },
    overlay: colors.overlay,
  }
}
