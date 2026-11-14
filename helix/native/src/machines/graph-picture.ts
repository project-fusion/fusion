/**
 * A phone's picture of a graph: core's `graphPicture`, the picture the web's
 * snapshot paints before a renderer loads, drawn as paths in the theme's
 * colors.
 *
 * **Each note stands where the page put it**, at its `x` and `y`. A note
 * with no place starts where core's `seedPositions` starts it, beside a
 * placed neighbor or on a spiral, and a graph small enough is then settled
 * by a few hundred steps of a spring layout, the same steps on every load,
 * so the same graph is drawn the same way each time.
 *
 * **The colors are worked out here**, as the snapshot's `color-mix()` writes
 * them, since React Native draws no `color-mix()`: each token from the theme,
 * moved toward another in sRGB. Paths that paint alike one after another are
 * one path, so a graph of thousands is a few dozen paths.
 */
import {
  type GraphInk,
  type GraphLink,
  type GraphNode,
  type GraphPicture,
  graphPicture,
  type PictureMark,
  seedPositions,
} from '@fusion.dev/helix-core/graph'
import { mix } from '../style/color'
import type { Theme } from '../theme/theme'
import { colorOf } from './heatmap-cells'

/** The most notes the spring layout settles: past it, the seeds stand as they are. */
const SETTLED = 240

/** The most notes a picture names every one of: past it, the hubs alone. */
const NAMED = 60

/** The most shapes one path joins, so no path's data is long enough to stall the renderer. */
const PIECES = 400

/** How many steps the spring layout takes. */
const STEPS = 220

/** One path of the drawing and how it is painted, as the tree's `--graph-*` hooks read it. */
export interface DrawnPath {
  readonly d: string
  readonly fill: string
  readonly fillOpacity: number
  readonly ink: string
  readonly key: string
  readonly stroke: string
  readonly width: number
}

/** A name over the drawing, at its place in the box. */
export interface DrawnLabel {
  readonly fade: number
  readonly ink: string
  readonly key: string
  readonly strong: boolean
  readonly text: string
  readonly x: number
  readonly y: number
}

/** What the drawing draws: its links, its notes, its names, the box, and the notes' places for a tap. */
export interface GraphDrawing {
  readonly lines: readonly DrawnPath[]
  readonly marks: readonly DrawnPath[]
  readonly names: readonly DrawnLabel[]
  readonly picture: GraphPicture | undefined
  readonly regions: readonly DrawnLabel[]
  readonly viewBox: string
}

/** A short number, so a path of thousands is not a page of decimals. */
const short = (value: number): string => String(Math.round(value * 10) / 10)

/** An ink in the theme's colors: a token, moved toward another in sRGB where the ink says. */
export const inkColor = (theme: Theme, ink: GraphInk): string => {
  const base = colorOf(theme, `color-${ink.base}`)
  return ink.toward === undefined || ink.by === undefined
    ? base
    : mix(colorOf(theme, `color-${ink.toward}`), ink.by, base, 'srgb')
}

/**
 * Each note's place: its own, or where the seeds start it, settled by a
 * spring layout where the graph is small enough. Placed notes stay where the
 * page put them.
 */
export const placesOf = (
  nodes: readonly GraphNode[],
  links: readonly GraphLink[],
): Map<string, { x: number; y: number }> => {
  const { positions, unplaced } = seedPositions(nodes, links)
  if (unplaced.size === 0 || nodes.length > SETTLED) {
    return positions
  }
  const ids = nodes.map((node) => node.id)
  const at = ids.map((id) => ({ ...(positions.get(id) as { x: number; y: number }) }))
  const index = new Map(ids.map((id, place) => [id, place]))
  const pairs = links.flatMap((link) => {
    const from = index.get(link.source)
    const to = index.get(link.target)
    return from === undefined || to === undefined || from === to ? [] : [[from, to] as const]
  })
  const moves = ids.map((id) => unplaced.has(id))
  for (let step = 0; step < STEPS; step += 1) {
    settle(at, pairs, moves, 1 - step / STEPS)
  }
  return new Map(ids.map((id, place) => [id, at[place] as { x: number; y: number }]))
}

/** One step of the spring layout: every pair pushes apart, every link pulls together, by `heat`. */
const settle = (
  at: { x: number; y: number }[],
  pairs: readonly (readonly [number, number])[],
  moves: readonly boolean[],
  heat: number,
) => {
  const push = at.map(() => ({ x: 0, y: 0 }))
  for (let one = 0; one < at.length; one += 1) {
    for (let other = one + 1; other < at.length; other += 1) {
      const a = at[one] as { x: number; y: number }
      const b = at[other] as { x: number; y: number }
      const dx = a.x - b.x || 0.01
      const dy = a.y - b.y || 0.01
      const apart = Math.max(dx * dx + dy * dy, 0.01)
      const force = 1 / apart
      ;(push[one] as { x: number; y: number }).x += dx * force
      ;(push[one] as { x: number; y: number }).y += dy * force
      ;(push[other] as { x: number; y: number }).x -= dx * force
      ;(push[other] as { x: number; y: number }).y -= dy * force
    }
  }
  for (const [from, to] of pairs) {
    const a = at[from] as { x: number; y: number }
    const b = at[to] as { x: number; y: number }
    const dx = (b.x - a.x) * 0.06
    const dy = (b.y - a.y) * 0.06
    ;(push[from] as { x: number; y: number }).x += dx
    ;(push[from] as { x: number; y: number }).y += dy
    ;(push[to] as { x: number; y: number }).x -= dx
    ;(push[to] as { x: number; y: number }).y -= dy
  }
  for (let one = 0; one < at.length; one += 1) {
    if (!moves[one]) {
      continue
    }
    const move = push[one] as { x: number; y: number }
    const length = Math.hypot(move.x, move.y)
    const most = 0.5 * heat
    const scale = length > most ? most / length : 1
    ;(at[one] as { x: number; y: number }).x += move.x * scale
    ;(at[one] as { x: number; y: number }).y += move.y * scale
  }
}

/** A note's shape as a path about `x` and `y`, `radius` across, as the snapshot draws it. */
const shapePath = (shape: string, x: number, y: number, radius: number): string => {
  if (shape === 'square') {
    const half = radius * 0.88
    return `M${short(x - half)} ${short(y - half)}h${short(half * 2)}v${short(half * 2)}h${short(-half * 2)}Z`
  }
  if (shape === 'diamond') {
    const reach = radius * 1.216
    return `M${short(x)} ${short(y - reach)}L${short(x + reach)} ${short(y)}L${short(x)} ${short(y + reach)}L${short(x - reach)} ${short(y)}Z`
  }
  return circlePath(x, y, radius)
}

/** A circle as a path. */
const circlePath = (x: number, y: number, radius: number): string =>
  `M${short(x - radius)} ${short(y)}a${short(radius)} ${short(radius)} 0 1 0 ${short(radius * 2)} 0a${short(radius)} ${short(radius)} 0 1 0 ${short(-radius * 2)} 0Z`

/** How one stroke or fill of a note is painted, before paths that paint alike join. */
type Paint = Omit<DrawnPath, 'd' | 'key'>

/** A note's paths, as the snapshot writes them: the selected one's glow, then its body by its emphasis. */
const markPaths = (mark: PictureMark, color: string): { d: string; paint: Paint }[] => {
  const { emphasis, radius, selected, shape, x, y } = mark
  const fillOnly = (opacity: number): Paint => ({
    fill: color,
    fillOpacity: opacity,
    ink: 'none',
    stroke: 'none',
    width: 0,
  })
  const ringOf = (width: number): Paint => ({
    fill: 'none',
    fillOpacity: 1,
    ink: color,
    stroke: color,
    width,
  })
  const glow = selected
    ? [
        { d: circlePath(x, y, radius * 2.2), paint: fillOnly(0.18) },
        { d: circlePath(x, y, radius * 1.32), paint: ringOf(Math.max(radius * 0.08, 1)) },
      ]
    : []
  const plain = shape === 'ring' ? 'circle' : shape
  if (emphasis === 'solid') {
    return [...glow, { d: shapePath(plain, x, y, radius), paint: fillOnly(1) }]
  }
  return [
    ...glow,
    ...(emphasis === 'subtle' ? [{ d: shapePath(shape, x, y, radius), paint: fillOnly(0.3) }] : []),
    { d: shapePath(plain, x, y, radius * 0.84), paint: ringOf(radius * 0.32) },
  ]
}

/**
 * Paths that paint alike one after another, joined into one. **The pieces are
 * joined once each run ends**: Hermes copies a string on every `+`, so adding
 * twenty thousand pieces one by one took minutes.
 */
const joined = (paths: readonly { d: string; paint: Paint }[], prefix: string): DrawnPath[] => {
  const runs: { paint: Paint; pieces: string[] }[] = []
  for (const { d, paint } of paths) {
    const last = runs[runs.length - 1]
    if (
      last !== undefined &&
      last.pieces.length < PIECES &&
      last.paint.fill === paint.fill &&
      last.paint.fillOpacity === paint.fillOpacity &&
      last.paint.stroke === paint.stroke &&
      last.paint.width === paint.width
    ) {
      last.pieces.push(d)
    } else {
      runs.push({ paint, pieces: [d] })
    }
  }
  return runs.map(({ paint, pieces }, at) => ({
    ...paint,
    d: pieces.join(''),
    key: `${prefix}${at}`,
  }))
}

/** Nothing drawn yet: a box with no size, or no notes. */
const NOTHING: GraphDrawing = {
  lines: [],
  marks: [],
  names: [],
  picture: undefined,
  regions: [],
  viewBox: '0 0 1 1',
}

/** What a phone draws of a graph `width` by `height` points, `active` selected. */
export const drawingOf = (
  graph: {
    readonly active: string
    readonly groups: readonly string[]
    readonly links: readonly GraphLink[]
    readonly nodes: readonly GraphNode[]
    readonly places: ReadonlyMap<string, { x: number; y: number }>
  },
  box: { readonly height: number; readonly width: number },
  theme: Theme,
): GraphDrawing => {
  if (!(box.width > 0 && box.height > 0) || graph.nodes.length === 0) {
    return NOTHING
  }
  const nodes = graph.nodes.map((node) => ({ ...node, ...graph.places.get(node.id) }))
  const picture = graphPicture(nodes, graph.links, {
    active: graph.active,
    /* Every group, so a group the legend hides leaves the others their colors. */
    groups: graph.groups,
    height: box.height,
    /* **Named at rest**, since a finger cannot hover a note to name it: every
       note in a small graph, and the hubs in a large one, each where it
       clears the names already placed. */
    labels: nodes.length <= NAMED ? 'all' : 'hubs',
    width: box.width,
  })
  if (picture === undefined) {
    return NOTHING
  }
  const lines = joined(
    picture.lines.map((line) => {
      const color = inkColor(theme, line.ink)
      return {
        d: `M${short(line.x1)} ${short(line.y1)}L${short(line.x2)} ${short(line.y2)}`,
        paint: { fill: 'none', fillOpacity: 1, ink: color, stroke: color, width: line.width },
      }
    }),
    'line-',
  )
  const marks = joined(
    picture.marks.flatMap((mark) => markPaths(mark, inkColor(theme, mark.ink))),
    'mark-',
  )
  return {
    lines,
    marks,
    names: picture.names.map((name, at) => ({
      fade: 1,
      ink: inkColor(theme, name.ink),
      key: `name-${at}`,
      strong: name.strong,
      text: name.text,
      x: name.x,
      /* From its baseline to its middle, where the word is centered. */
      y: name.y - name.size * 0.35,
    })),
    picture,
    regions: picture.regions.map((region, at) => ({
      fade: region.fade,
      ink: inkColor(theme, region.ink),
      key: `region-${at}`,
      strong: false,
      text: region.text,
      x: region.x,
      y: region.y,
    })),
    viewBox: `0 0 ${short(box.width)} ${short(box.height)}`,
  }
}

/** The note under a point of the box, front first, within a finger's reach of its edge. */
export const noteAt = (
  picture: GraphPicture | undefined,
  point: { readonly x: number; readonly y: number },
  reach: number,
): string | undefined => {
  if (picture === undefined) {
    return undefined
  }
  let best: { id: string; off: number } | undefined
  for (let at = picture.marks.length - 1; at >= 0; at -= 1) {
    const mark = picture.marks[at] as PictureMark
    const off = Math.hypot(mark.x - point.x, mark.y - point.y) - mark.radius
    if (off <= reach && (best === undefined || off < best.off)) {
      best = { id: mark.id, off }
    }
  }
  return best?.id
}
