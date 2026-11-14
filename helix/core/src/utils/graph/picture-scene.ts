/*
 * What a graph's picture is made of, and what each part of it reads: the
 * notes by id, the links drawn, the selection, each note's ink and radius,
 * and where each note stands in the box.
 */
import type {
  GraphNodeEmphasis,
  GraphNodeMaterial,
  GraphNodeShape,
  GraphNodeTone,
} from './model.js'
import { type GraphReach, reachOf } from './reach.js'
import { pixelsOf, sizeOf } from './sizes.js'

/** A note, as the picture draws it, with its place given. */
export interface PictureNode {
  emphasis?: GraphNodeEmphasis | undefined
  group?: string | undefined
  id: string
  label?: string | undefined
  material?: GraphNodeMaterial | undefined
  shape?: GraphNodeShape | undefined
  size?: number | undefined
  tone?: GraphNodeTone | undefined
  x?: number | undefined
  y?: number | undefined
}

/** A link, as the picture draws it. */
export interface PictureLink {
  source: string
  target: string
}

/** What a picture draws, and the box it is drawn for. */
export interface GraphPictureOptions {
  /** The selected note, lit as the frame lights it. None by default. */
  active?: string | undefined
  /**
   * The part of the graph the drawing fits, as Sigma's `setCustomBBox` takes
   * it. The box around the notes by default.
   */
  bounds?: { x: readonly [number, number]; y: readonly [number, number] } | null | undefined
  /**
   * Every group's name, which the series colors are handed out over: the
   * notes' own by default. A drawing that leaves a group's notes out passes
   * every group, so each keeps its color.
   */
  groups?: readonly string[] | undefined
  /** How heavily a note is drawn where it does not say. */
  emphasis?: GraphNodeEmphasis | undefined
  /** Whether each group's name is drawn over its notes. On by default. */
  groupLabels?: boolean | undefined
  /** The box's height, in pixels. 480 by default. */
  height?: number | undefined
  /** Which notes are named: `hover` by default. */
  labels?: 'all' | 'hover' | 'hubs' | undefined
  /** The room kept at each edge, in pixels. 30 by default. */
  padding?: number | undefined
  /** How far `active` reaches. `links` by default. */
  reach?: GraphReach | undefined
  /** A note's shape where it does not say. */
  shape?: GraphNodeShape | undefined
  /** The box's width, in pixels. 1200 by default. */
  width?: number | undefined
}

/**
 * A color, as theme tokens: the token `color-<base>`, moved toward the token
 * `color-<toward>` by `by` percent in sRGB where `toward` is given.
 */
export interface GraphInk {
  readonly base: string
  readonly by?: number | undefined
  readonly toward?: string | undefined
}

/** A link as the picture draws it, the links on the selection's way after the rest. */
export interface PictureLine {
  readonly ink: GraphInk
  readonly raised: boolean
  readonly width: number
  readonly x1: number
  readonly x2: number
  readonly y1: number
  readonly y2: number
}

/** A note as the picture draws it, the selection's over the rest and the selected one last. */
export interface PictureMark {
  /** How heavily it is drawn, a ring always `outlined`. */
  readonly emphasis: GraphNodeEmphasis
  readonly id: string
  readonly ink: GraphInk
  readonly radius: number
  /** Whether it is the selected note, which takes a glow. */
  readonly selected: boolean
  readonly shape: GraphNodeShape
  readonly x: number
  readonly y: number
}

/** A note's name, after it or before it, left out where it would cover another. */
export interface PictureName {
  readonly ink: GraphInk
  readonly size: number
  readonly strong: boolean
  readonly text: string
  readonly x: number
  /** The baseline. */
  readonly y: number
}

/** A group's name over the middle of its notes. */
export interface PictureRegion {
  readonly fade: number
  readonly ink: GraphInk
  readonly text: string
  readonly x: number
  /** The middle of the line. */
  readonly y: number
}

/** A graph's picture, in a box `width` by `height` pixels. */
export interface GraphPicture {
  readonly height: number
  readonly lines: readonly PictureLine[]
  readonly marks: readonly PictureMark[]
  readonly names: readonly PictureName[]
  readonly regions: readonly PictureRegion[]
  readonly width: number
}

/** How many of the series tokens a graph reads, as `graphColorsFrom` reads them. */
const SERIES = 24

/** How far a note outside the selected one's reach is faded toward the ground, as the drawing fades it. */
export const FADED = 75

/** How large a note is drawn, in pixels, for `labels: 'hubs'` to name it at rest, as the Sigma driver names it. */
export const HUB = 6.5

/** The size a name is drawn at, in pixels, as the Sigma driver draws it: the strong a step larger. */
export const LABEL = 13

/**
 * How wide a name is drawn, in pixels, measured without a canvas: about
 * the average letter of a sans face, at its size. A name a little wider or
 * narrower than drawn only moves where the next is left out.
 */
export const widthOf = (text: string, size: number): number => text.length * size * 0.56

/** One ink moved toward a token by `by` percent, or the ink itself where `by` is none. */
export const mixed = (from: GraphInk, toward: string, by: number): GraphInk =>
  by <= 0 ? from : { base: from.base, by, toward }

/** A tone's ink, as `toneColor` reads it: `neutral` is the muted ink. */
const toneOf = (tone: GraphNodeTone): GraphInk => ({
  base: tone === 'neutral' ? 'foreground-muted' : tone,
})

/**
 * How far Sigma corrects the fit for a box and a graph of different
 * proportions, as its own `getCorrectionRatio` does, so a picture fits the
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

/** Where each note stands in the box: fitted as Sigma fits, the larger extent across the smaller side, up the page. */
export const placesOf = (nodes: readonly PictureNode[], options: GraphPictureOptions) => {
  const width = options.width ?? 1200
  const height = options.height ?? 480
  const padding = options.padding ?? 30
  const xs = nodes.map((node) => node.x as number)
  const ys = nodes.map((node) => node.y as number)
  const [left, right] = options.bounds?.x ?? [Math.min(...xs), Math.max(...xs)]
  const [bottom, top] = options.bounds?.y ?? [Math.min(...ys), Math.max(...ys)]
  const extent = Math.max(right - left, top - bottom) || 1
  const scale =
    ((Math.min(width, height) - 2 * padding) *
      correctionOf(width, height, right - left, top - bottom)) /
    extent
  return (node: PictureNode): { x: number; y: number } => ({
    x: width / 2 + ((node.x as number) - (left + right) / 2) * scale,
    y: height / 2 - ((node.y as number) - (bottom + top) / 2) * scale,
  })
}

/** What every part of the picture reads: the notes by id, the links drawn, the selection, and each note's ink and radius. */
export const sceneOf = (
  nodes: readonly PictureNode[],
  links: readonly PictureLink[],
  options: GraphPictureOptions,
) => {
  const notes = new Map(nodes.map((node) => [node.id, node]))
  const drawn = links.filter(
    (link) => link.source !== link.target && notes.has(link.source) && notes.has(link.target),
  )
  const selected = options.active && notes.has(options.active) ? options.active : undefined
  const reached =
    selected === undefined ? undefined : reachOf(selected, drawn, options.reach ?? 'links')
  const near = reached?.near ?? new Set<string>()
  /* Groups take the series in the order of their names, as the drawing gives them. */
  const groups = [
    ...new Set(options.groups ?? nodes.flatMap((node) => (node.group ? [node.group] : []))),
  ].sort()
  const series = new Map(
    groups.map((group, index): [string, GraphInk] => [
      group,
      { base: `series-${(index % SERIES) + 1}` },
    ]),
  )
  const own = (node: PictureNode): GraphInk =>
    node.tone
      ? toneOf(node.tone)
      : ((node.group ? series.get(node.group) : undefined) ?? { base: 'foreground-muted' })
  const faded = (node: PictureNode): boolean =>
    selected !== undefined && node.id !== selected && !near.has(node.id)
  const degree = new Map<string, number>()
  for (const { source, target } of drawn) {
    degree.set(source, (degree.get(source) ?? 0) + 1)
    degree.set(target, (degree.get(target) ?? 0) + 1)
  }
  const radiusOf = (node: PictureNode): number =>
    pixelsOf(sizeOf(node.size, degree.get(node.id) ?? 0)) *
    (node.id === selected ? 1.5 : near.has(node.id) ? 1.25 : 1)
  return { degree, drawn, faded, groups, near, notes, own, radiusOf, reached, selected }
}

export type Scene = ReturnType<typeof sceneOf>
export type At = (node: PictureNode) => { x: number; y: number }
