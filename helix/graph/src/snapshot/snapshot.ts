import type { GraphTone, NodeLook, NoteFacts } from '../connect-graph/looks.js'
import { type GraphReach, reachOf } from '../connect-graph/reach.js'
import { pixelsOf, sizeOf } from '../connect-graph/sizes.js'
import { type Box, clearOf } from '../overlay/overlay.js'

/** A note, as a snapshot draws it: the frame's own, with its place given. */
export interface SnapshotNode extends NoteFacts {
  id: string
  label?: string | undefined
  size?: number | undefined
  x?: number | undefined
  y?: number | undefined
}

/** A link, as a snapshot draws it. */
export interface SnapshotLink {
  source: string
  target: string
}

/** What a snapshot draws, and the box it is drawn for. */
export interface GraphSnapshotOptions {
  /** The selected note, lit as the frame lights it. None by default. */
  active?: string | undefined
  /**
   * The part of the graph the drawing fits, as Sigma's `setCustomBBox` takes
   * it. The box around the notes by default. Give both the same box.
   */
  bounds?: { x: readonly [number, number]; y: readonly [number, number] } | null | undefined
  /** How heavily a note is drawn where it does not say, as the Sigma driver's `emphasis`. */
  emphasis?: NodeLook['emphasis']
  /** Whether each group's name is drawn over its notes, as the Sigma driver's `groupLabels`. On by default. */
  groupLabels?: boolean | undefined
  /** The box's height, in pixels. 480 by default. */
  height?: number | undefined
  /** Which notes are named, as the Sigma driver's `labels`. `hover` by default. */
  labels?: 'all' | 'hover' | 'hubs' | undefined
  /** The room kept at each edge, in pixels, as Sigma's `stagePadding`. 30 by default. */
  padding?: number | undefined
  /** How far `active` reaches, as `connectGraph`'s `reach`. `links` by default. */
  reach?: GraphReach | undefined
  /** A note's shape where it does not say, as the Sigma driver's `shape`. */
  shape?: NodeLook['shape']
  /** The box's width, in pixels. 1200 by default. */
  width?: number | undefined
}

/** How many of the series tokens a graph reads, as `graphColorsFrom` reads them. */
const SERIES = 24

/** How far a note outside the selected one's reach is faded toward the ground, as the drawing fades it. */
const FADED = 75

/** How large a note is drawn, in pixels, for `labels: 'hubs'` to name it at rest, as the Sigma driver names it. */
const HUB = 6.5

/** The size a name is drawn at, in pixels, as the Sigma driver draws it: the strong a step larger. */
const LABEL = 13

/**
 * How wide a name is drawn, in pixels, measured without a canvas: about
 * the average letter of a sans face, at its size. A name a little wider or
 * narrower than drawn only moves where the next is left out.
 */
const widthOf = (text: string, size: number): number => text.length * size * 0.56

/** Text made safe to write into markup. */
const escaped = (text: string): string =>
  text.replace(
    /[&<>"']/g,
    (character) =>
      ({ "'": '&#39;', '"': '&quot;', '&': '&amp;', '<': '&lt;', '>': '&gt;' })[
        character
      ] as string,
  )

/** A number written short, so a graph of thousands is not a page of decimals. */
const short = (value: number): string => String(Math.round(value * 10) / 10)

/** A token, as CSS reads it. */
const token = (name: string): string => `var(--helix-color-${name})`

/** One color moved toward another by `amount`, in percent, as `mixRgb` moves it: in sRGB. */
const mix = (from: string, to: string, amount: number): string =>
  amount <= 0 ? from : `color-mix(in srgb, ${to} ${short(amount)}%, ${from})`

/** A tone's color, as `toneColor` reads it: `neutral` is the muted ink, and no tone is `primary`. */
const toneOf = (tone: GraphTone): string =>
  tone === 'primary'
    ? token('primary')
    : tone === 'neutral'
      ? token('foreground-muted')
      : token(tone)

/**
 * How far Sigma corrects the fit for a box and a graph of different
 * proportions, as its own `getCorrectionRatio` does, so a snapshot fits the
 * graph where Sigma will.
 */
const correctionOf = (width: number, height: number, across: number, down: number): number => {
  const box = height / width
  const graph = down / across
  if ((box < 1 && graph > 1) || (box > 1 && graph < 1)) {
    return 1
  }
  const ratio = Math.min(Math.max(graph, 1 / graph), Math.max(1 / box, box))
  return Number.isFinite(ratio) ? ratio : 1
}

/** A note's shape as markup, about `x` and `y`, `radius` across, as the node program draws it. */
const shapeOf = (
  shape: NonNullable<NodeLook['shape']>,
  x: number,
  y: number,
  radius: number,
  paint: string,
): string => {
  if (shape === 'square') {
    const half = radius * 0.88
    return `<rect height="${short(half * 2)}" rx="${short(radius * 0.18)}" width="${short(half * 2)}" x="${short(x - half)}" y="${short(y - half)}" ${paint}/>`
  }
  if (shape === 'diamond') {
    const reach = radius * 1.216
    return `<path d="M${short(x)} ${short(y - reach)}L${short(x + reach)} ${short(y)}L${short(x)} ${short(y + reach)}L${short(x - reach)} ${short(y)}Z" ${paint}/>`
  }
  return `<circle cx="${short(x)}" cy="${short(y)}" r="${short(radius)}" ${paint}/>`
}

/**
 * **The graph drawn on the server, as an SVG in the theme's colors**, for a
 * page to paint before the renderer has loaded. Put it in the frame after
 * the element the renderer draws in, and `connectGraph` fades it out once
 * the renderer has drawn the graph whole.
 *
 * **Where Sigma.js draws it**: fitted to the box as Sigma fits a graph, each
 * note its size and its group's or tone's color, each link tinted by the
 * note it leaves, and the names placed after their notes and left out where
 * one would cover another. The colors are the theme's tokens, so it is
 * light or dark with the page.
 *
 * **Whole or absent.** An empty string where any note has no `x` and `y`,
 * since only a layout run in the browser could place it.
 */
export const graphSnapshot = (
  nodes: readonly SnapshotNode[],
  links: readonly SnapshotLink[],
  options: GraphSnapshotOptions = {},
): string => {
  const width = options.width ?? 1200
  const height = options.height ?? 480
  const padding = options.padding ?? 30
  if (
    nodes.length === 0 ||
    nodes.some((node) => !(Number.isFinite(node.x) && Number.isFinite(node.y)))
  ) {
    return ''
  }
  const notes = new Map(nodes.map((node) => [node.id, node]))
  const drawn = links.filter(
    (link) => link.source !== link.target && notes.has(link.source) && notes.has(link.target),
  )

  /* Fitted as Sigma fits: the larger extent across the smaller side of the
     box, corrected for the proportions of each, and up the page. */
  const xs = nodes.map((node) => node.x as number)
  const ys = nodes.map((node) => node.y as number)
  const [left, right] = options.bounds?.x ?? [Math.min(...xs), Math.max(...xs)]
  const [bottom, top] = options.bounds?.y ?? [Math.min(...ys), Math.max(...ys)]
  const extent = Math.max(right - left, top - bottom) || 1
  const scale =
    ((Math.min(width, height) - 2 * padding) *
      correctionOf(width, height, right - left, top - bottom)) /
    extent
  const at = (node: SnapshotNode): { x: number; y: number } => ({
    x: width / 2 + ((node.x as number) - (left + right) / 2) * scale,
    y: height / 2 - ((node.y as number) - (bottom + top) / 2) * scale,
  })

  /* The selection's reach, as the drawing lights it. */
  const selected = options.active && notes.has(options.active) ? options.active : undefined
  const reached =
    selected === undefined ? undefined : reachOf(selected, drawn, options.reach ?? 'links')
  const near = reached?.near ?? new Set<string>()

  /* Groups take the series in the order of their names, as the drawing gives them. */
  const groups = [...new Set(nodes.flatMap((node) => (node.group ? [node.group] : [])))].sort()
  const series = new Map(
    groups.map((group, index) => [group, token(`series-${(index % SERIES) + 1}`)]),
  )
  const own = (node: SnapshotNode): string =>
    node.tone
      ? toneOf(node.tone)
      : ((node.group && series.get(node.group)) ?? token('foreground-muted'))
  const ground = token('surface-sunken')
  const faded = (node: SnapshotNode): boolean =>
    selected !== undefined && node.id !== selected && !near.has(node.id)

  const degree = new Map<string, number>()
  for (const { source, target } of drawn) {
    degree.set(source, (degree.get(source) ?? 0) + 1)
    degree.set(target, (degree.get(target) ?? 0) + 1)
  }
  const radiusOf = (node: SnapshotNode): number =>
    pixelsOf(sizeOf(node.size, degree.get(node.id) ?? 0)) *
    (node.id === selected ? 1.5 : near.has(node.id) ? 1.25 : 1)

  /* **A link at rest steps back as far as the graph is dense**, as the
     drawing's does, and one on the selection's way takes its color. */
  const along = Math.min(Math.max(Math.log(drawn.length / 50) / Math.log(2000 / 50), 0), 1)
  const rest = (0.35 + (0.72 - 0.35) * along) * 100
  const lines: string[] = []
  const raisedLines: string[] = []
  for (const link of drawn) {
    const from = at(notes.get(link.source) as SnapshotNode)
    const to = at(notes.get(link.target) as SnapshotNode)
    const lit = reached?.along(link.source, link.target) ?? false
    const color = lit
      ? own(notes.get(selected as string) as SnapshotNode)
      : selected !== undefined
        ? mix(token('border'), ground, 60)
        : mix(own(notes.get(link.source) as SnapshotNode), ground, rest)
    ;(lit ? raisedLines : lines).push(
      `<line style="stroke:${color}" stroke-width="${lit ? 1.2 : 0.6}" x1="${short(from.x)}" x2="${short(to.x)}" y1="${short(from.y)}" y2="${short(to.y)}"/>`,
    )
  }

  /* The notes, the selection's over the rest and the selected one last. */
  const order = (node: SnapshotNode): number =>
    node.id === selected ? 2 : near.has(node.id) ? 1 : 0
  const shapes = [...nodes]
    .sort((one, other) => order(one) - order(other))
    .map((node) => {
      const { x, y } = at(node)
      const radius = radiusOf(node)
      const color = faded(node) ? mix(own(node), ground, FADED) : own(node)
      const shape = node.shape ?? options.shape ?? 'circle'
      /* A ring is a circle drawn outlined, whatever its emphasis says. */
      const emphasis =
        shape === 'ring' ? 'outlined' : (node.emphasis ?? options.emphasis ?? 'solid')
      const body =
        emphasis === 'solid'
          ? shapeOf(shape === 'ring' ? 'circle' : shape, x, y, radius, `style="fill:${color}"`)
          : /* A band a third of the radius deep, inside the edge, and a faint fill within it where subtle. */
            (emphasis === 'subtle'
              ? shapeOf(shape, x, y, radius, `fill-opacity="0.3" style="fill:${color}"`)
              : '') +
            shapeOf(
              shape === 'ring' ? 'circle' : shape,
              x,
              y,
              radius * 0.84,
              `fill="none" stroke-width="${short(radius * 0.32)}" style="stroke:${color}"`,
            )
      /* The selected note's glow: a fine ring just clear of its edge and a soft light past it. */
      const glow =
        node.id === selected
          ? `<circle cx="${short(x)}" cy="${short(y)}" fill-opacity="0.18" r="${short(radius * 2.2)}" style="fill:${color}"/>` +
            `<circle cx="${short(x)}" cy="${short(y)}" fill="none" r="${short(radius * 1.32)}" stroke-width="${short(Math.max(radius * 0.08, 1))}" style="stroke:${color}"/>`
          : ''
      return glow + body
    })

  /* **The names, as the Sigma driver names them**: the selected note's
     always, the rest where `labels` says and only where clear of a name
     already placed, the larger note's first. After the note, or before it
     where after would run off the drawing. */
  const naming = options.labels ?? 'hover'
  const taken: Box[] = []
  const names: string[] = []
  const candidates = nodes
    .filter((node) => {
      if (!node.label && !node.id) {
        return false
      }
      if (node.id === selected) {
        return true
      }
      if (faded(node)) {
        return false
      }
      return (
        near.has(node.id) ||
        naming === 'all' ||
        (naming === 'hubs' && pixelsOf(sizeOf(node.size, degree.get(node.id) ?? 0)) >= HUB)
      )
    })
    .sort(
      (one, other) =>
        (other.id === selected ? 1 : 0) - (one.id === selected ? 1 : 0) ||
        radiusOf(other) - radiusOf(one),
    )
  for (const node of candidates) {
    const text = node.label || node.id
    const strong = node.id === selected || near.has(node.id)
    const size = strong ? LABEL : LABEL - 1
    const { x, y } = at(node)
    const radius = radiusOf(node)
    const wide = widthOf(text, size)
    const line = y + size / 3
    const boxAt = (from: number): Box => ({
      bottom: line + 4,
      left: from - 2,
      right: from + wide + 2,
      top: line - size,
    })
    const after = x + radius + 4
    const fits = (from: number): boolean => {
      const box = boxAt(from)
      return box.left >= 0 && box.right <= width && clearOf(box, taken)
    }
    const before = x - radius - 4 - wide
    const start = fits(after) || !fits(before) ? after : before
    const box = boxAt(start)
    if (!clearOf(box, taken) && node.id !== selected) {
      continue
    }
    taken.push(box)
    names.push(
      `<text font-size="${size}" font-weight="${strong ? 600 : 500}" style="fill:${token(strong ? 'foreground' : 'foreground-muted')};stroke:${ground}" x="${short(start)}" y="${short(line)}">${escaped(text)}</text>`,
    )
  }

  /* **Each group's name over the middle of its notes**, as the overlay names
     it: small capitals spread wide, in the group's color made quiet, and
     only where the group is spread wide enough for the name to say which
     notes it means and a line is clear of the names. */
  const regions: string[] = []
  if (options.groupLabels !== false) {
    const ownGroup = selected === undefined ? undefined : notes.get(selected)?.group
    for (const group of groups) {
      const members = nodes.filter((node) => node.group === group)
      const points = members.map(at)
      const middle = {
        x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
        y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
      }
      const spread =
        points.reduce((sum, point) => sum + Math.hypot(point.x - middle.x, point.y - middle.y), 0) /
        points.length
      if (points.length < 2 || spread < 12) {
        continue
      }
      const name = group.toLocaleUpperCase()
      const half = (widthOf(name, 11) * 1.14) / 2 + 4
      const boxAt = (y: number): Box => ({
        bottom: y + 9,
        left: middle.x - half,
        right: middle.x + half,
        top: y - 9,
      })
      const y = [0, 18, -18]
        .map((step) => middle.y + step)
        .find((one) => clearOf(boxAt(one), taken))
      if (y === undefined) {
        continue
      }
      taken.push(boxAt(y))
      const tinted = members.find((node) => node.tone === undefined) ?? members[0]
      const color = mix(tinted ? own(tinted) : token('foreground-muted'), token('foreground'), 60)
      const fade = selected !== undefined && ownGroup !== group ? 0.3 : 0.92
      regions.push(
        `<text dominant-baseline="middle" fill-opacity="${fade}" font-size="11" font-weight="650" letter-spacing="0.14em" style="fill:${color};stroke:${ground}" text-anchor="middle" x="${short(middle.x)}" y="${short(y)}">${escaped(name)}</text>`,
      )
    }
  }

  /* The names in the frame's own face, which the markup inherits from the page. */
  return (
    `<div aria-hidden="true" data-helix-graph-snapshot style="inset:0;overflow:hidden;pointer-events:none;position:absolute">` +
    `<svg height="${height}" viewBox="0 0 ${width} ${height}" width="${width}" xmlns="http://www.w3.org/2000/svg" style="left:50%;position:absolute;top:50%;translate:-50% -50%">` +
    `<g stroke-linecap="round">${lines.join('')}${raisedLines.join('')}</g>` +
    `<g>${shapes.join('')}</g>` +
    `<g paint-order="stroke" stroke-linejoin="round" stroke-width="3">${regions.join('')}${names.join('')}</g>` +
    `</svg></div>`
  )
}
