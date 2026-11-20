/**
 * A board's cards and connections as a phone reads them from its children,
 * and what it draws of them: each connection's line in a box of its own,
 * its arrowheads, its label, the order a screen reader walks them in, and
 * what a finger lands on.
 *
 * **The numbers are core's**, as the web's are: `connector` gives a line and
 * its middle, `reading` the order, `planeOf` the plane. A line is drawn in
 * its box's hundredths, so the box can be stretched to its size with no
 * view box of its own, and its stroke keeps its width by not scaling.
 */
import {
  type CanvasEdge,
  type CanvasNode,
  connector,
  edgeKeyBase,
  HEAD,
  heads,
  onPlane,
  reading,
} from '@fusion.dev/helix-core/canvas'
import { Children, isValidElement, type ReactElement, type ReactNode } from 'react'

/** A card's tag, and a connection's, as the element around finds them. */
export const NODE_TAG = 'helix-canvas-node'
export const EDGE_TAG = 'helix-canvas-edge'

type Element = ReactElement<Readonly<Record<string, unknown>>>

/** A point in the document's own units, or on the plane. */
interface Point {
  readonly x: number
  readonly y: number
}

/** The words a node holds, its strings and its children's, less what goes in a named slot. */
export const textOf = (node: ReactNode): string =>
  Children.toArray(node)
    .map((one) =>
      typeof one === 'string' || typeof one === 'number'
        ? String(one)
        : isValidElement<{ children?: ReactNode; slot?: string }>(one) &&
            one.props.slot === undefined
          ? textOf(one.props.children)
          : '',
    )
    .join('')
    .replace(/\s+/g, ' ')
    .trim()

const isTagged = (child: ReactNode, tag: string): child is Element =>
  isValidElement(child) && (child.type as { readonly tag?: unknown }).tag === tag

const finite = (value: unknown): number => {
  const number = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(number) ? number : 0
}

const words = (value: unknown): string | undefined =>
  typeof value === 'string' && value !== '' ? value : undefined

/** A card the page passed in, with the document's reading of it. */
export interface Card {
  readonly element: Element
  readonly node: CanvasNode
}

/** The cards passed in, the first of each name, as the web's walk reaches them. */
export const cardsOf = (children: unknown): readonly Card[] => {
  const seen = new Set<string>()
  return Children.toArray(children as ReactNode)
    .filter((child) => isTagged(child, NODE_TAG))
    .flatMap((element): Card[] => {
      const { props } = element
      const id = words(props.name) ?? ''
      if (seen.has(id)) {
        return []
      }
      seen.add(id)
      return [
        {
          element,
          node: {
            height: finite(props.height),
            id,
            label: words(props.label),
            text: textOf(props.children as ReactNode) || undefined,
            type: props.group === true ? 'group' : 'text',
            width: finite(props.width),
            x: finite(props.x),
            y: finite(props.y),
          },
        },
      ]
    })
}

/** A connection the page passed in, with its tone and its stroke. */
export interface Link {
  readonly edge: CanvasEdge
  readonly key: string
  readonly stroke: string
  readonly tone: string
}

const end = (value: unknown): CanvasEdge['toEnd'] =>
  value === 'arrow' || value === 'none' ? value : undefined

/** A connection as the document reads it, from the props of the element that declares it. */
const edgeOf = (props: Readonly<Record<string, unknown>>): CanvasEdge => ({
  fromEnd: end(props.fromEnd),
  fromNode: words(props.from) ?? '',
  fromSide: words(props.fromSide) as CanvasEdge['fromSide'],
  id: words(props.name) ?? '',
  label: words(props.label),
  path: words(props.path) as CanvasEdge['path'],
  toEnd: end(props.toEnd),
  toNode: words(props.to) ?? '',
  toSide: words(props.toSide) as CanvasEdge['toSide'],
})

/** The connections passed in, each keyed as the web keys it, a second one between the same two cards told apart. */
export const linksOf = (children: unknown): readonly Link[] => {
  const taken = new Map<string, number>()
  return Children.toArray(children as ReactNode)
    .filter((child) => isTagged(child, EDGE_TAG))
    .map(({ props }) => {
      const edge = edgeOf(props)
      const base = edgeKeyBase(edge)
      const count = edge.id === '' ? (taken.get(base) ?? 0) + 1 : 1
      taken.set(base, count)
      return {
        edge,
        key: count === 1 ? base : `${base}#${count}`,
        stroke: words(props.stroke) ?? '',
        tone: words(props.tone) ?? '',
      }
    })
}

/** A stop a screen reader walks to: a card, or a connection after the card it leaves. */
export type Stop =
  | { readonly kind: 'node'; readonly key: string }
  | (Link & { readonly kind: 'edge' })

/** Each card in core's reading order, then the connections leaving it whose two cards are both there. */
export const walkOf = (
  nodes: readonly CanvasNode[],
  links: readonly Link[],
  order: 'edges' | 'spatial',
): readonly Stop[] => {
  const ids = new Set(nodes.map((node) => node.id))
  const leaving = new Map<string, Stop[]>()
  for (const link of links) {
    if (ids.has(link.edge.fromNode) && ids.has(link.edge.toNode)) {
      leaving.set(link.edge.fromNode, [
        ...(leaving.get(link.edge.fromNode) ?? []),
        { ...link, kind: 'edge' },
      ])
    }
  }
  return reading(
    [...nodes],
    links.map((one) => one.edge),
    order,
  ).flatMap((node): Stop[] => [{ key: node.id, kind: 'node' }, ...(leaving.get(node.id) ?? [])])
}

/** The points a path's commands pass through or bend toward, in order. */
const pointsOf = (d: string): Point[] => {
  const numbers = (d.match(/-?\d*\.?\d+(?:e-?\d+)?/gi) ?? []).map(Number)
  const points: Point[] = []
  for (let at = 0; at + 1 < numbers.length; at += 2) {
    points.push({ x: numbers[at] ?? 0, y: numbers[at + 1] ?? 0 })
  }
  return points
}

const unit = (from: Point, to: Point): Point => {
  const length = Math.hypot(to.x - from.x, to.y - from.y) || 1
  return { x: (to.x - from.x) / length, y: (to.y - from.y) / length }
}

/** An arrowhead whose base sits at `at`, pointing `way`, as the web's marker draws one: a head long, half a head either side. */
const head = (at: Point, way: Point): Point[] => [
  { x: at.x + way.x * HEAD, y: at.y + way.y * HEAD },
  { x: at.x - (way.y * HEAD) / 2, y: at.y + (way.x * HEAD) / 2 },
  { x: at.x + (way.y * HEAD) / 2, y: at.y - (way.x * HEAD) / 2 },
]

/** One connection's box on the plane, its line and its heads in the box's hundredths, and what it is drawn as. */
export interface Line {
  readonly d: string
  readonly head: string
  readonly height: number
  readonly key: string
  readonly mid: Point
  readonly points: readonly Point[]
  readonly selected: boolean
  readonly stroke: string
  readonly tone: string
  readonly width: number
  readonly x: number
  readonly y: number
}

/** The room a line's box keeps around it, for its stroke and its heads. */
const ROOM = HEAD + 4

const scaled = (points: readonly Point[], box: { x: number; y: number; w: number; h: number }) =>
  points.map((point) => ({
    x: Math.round(((point.x - box.x) / box.w) * 10000) / 100,
    y: Math.round(((point.y - box.y) / box.h) * 10000) / 100,
  }))

/** The same commands as `d`, at the box's hundredths. */
const rewritten = (d: string, box: { x: number; y: number; w: number; h: number }): string => {
  const flat = scaled(pointsOf(d), box).flatMap((point) => [point.x, point.y])
  let at = 0
  return d.replace(/-?\d*\.?\d+(?:e-?\d+)?/gi, () => String(flat[at++] ?? 0))
}

/** One connection drawn on the plane, where both its cards are on the board. */
const lineOf = (
  link: Link,
  from: CanvasNode,
  to: CanvasNode,
  path: 'curve' | 'step' | 'straight',
  selected: boolean,
): Line => {
  const ends = heads(link.edge)
  const drawn = connector(link.edge, from, to, link.edge.path ?? path, ends)
  const points = pointsOf(drawn.d)
  const first = points[0] ?? { x: 0, y: 0 }
  const second = points[1] ?? first
  const last = points.at(-1) ?? first
  const before = points.at(-2) ?? last
  const tips = [
    ...(ends.start ? [head(first, unit(second, first))] : []),
    ...(ends.end ? [head(last, unit(before, last))] : []),
  ]
  const all = [...points, ...tips.flat()]
  const left = Math.min(...all.map((one) => one.x)) - ROOM
  const top = Math.min(...all.map((one) => one.y)) - ROOM
  const box = {
    h: Math.max(...all.map((one) => one.y)) + ROOM - top,
    w: Math.max(...all.map((one) => one.x)) + ROOM - left,
    x: left,
    y: top,
  }
  const headPath = tips
    .map((tip) => {
      const [a, b, c] = scaled(tip, box)
      return `M ${a?.x} ${a?.y} L ${b?.x} ${b?.y} L ${c?.x} ${c?.y} Z`
    })
    .join(' ')
  return {
    d: rewritten(drawn.d, box),
    head: headPath || 'M 0 0',
    height: box.h,
    key: link.key,
    mid: drawn.mid,
    points,
    selected,
    stroke: link.stroke,
    tone: link.tone,
    width: box.w,
    x: box.x,
    y: box.y,
  }
}

/** Every connection whose two cards are on the board, drawn on the plane whose corner is `origin`. */
export const linesOf = (
  links: readonly Link[],
  nodes: readonly CanvasNode[],
  origin: Point,
  path: 'curve' | 'step' | 'straight',
  picked: ReadonlySet<string>,
): readonly Line[] => {
  const byId = new Map(nodes.map((node) => [node.id, onPlane(node, origin)]))
  return links.flatMap((link) => {
    const from = byId.get(link.edge.fromNode)
    const to = byId.get(link.edge.toNode)
    return from === undefined || to === undefined
      ? []
      : [lineOf(link, from, to, path, picked.has(link.key))]
  })
}

/** How far `point` is from the segment `a` to `b`. */
const fromSegment = (point: Point, a: Point, b: Point): number => {
  const across = { x: b.x - a.x, y: b.y - a.y }
  const length = across.x * across.x + across.y * across.y
  const share =
    length === 0
      ? 0
      : Math.max(0, Math.min(1, ((point.x - a.x) * across.x + (point.y - a.y) * across.y) / length))
  return Math.hypot(point.x - (a.x + across.x * share), point.y - (a.y + across.y * share))
}

/** A cubic's points at even steps, so a curve is measured as a run of short lines. */
const sampled = (points: readonly Point[]): Point[] => {
  if (points.length !== 4) {
    return [...points]
  }
  const [a, b, c, d] = points as [Point, Point, Point, Point]
  return Array.from({ length: 17 }, (_, step) => {
    const t = step / 16
    const u = 1 - t
    return {
      x: u * u * u * a.x + 3 * u * u * t * b.x + 3 * u * t * t * c.x + t * t * t * d.x,
      y: u * u * u * a.y + 3 * u * u * t * b.y + 3 * u * t * t * c.y + t * t * t * d.y,
    }
  })
}

/** The connection whose line passes nearest `point` on the plane, within `reach`. */
export const lineAt = (lines: readonly Line[], point: Point, reach: number): Line | undefined => {
  let found: Line | undefined
  let best = reach
  for (const line of lines) {
    const run = sampled(line.points)
    for (let at = 1; at < run.length; at++) {
      const away = fromSegment(point, run[at - 1] as Point, run[at] as Point)
      if (away <= best) {
        best = away
        found = line
      }
    }
  }
  return found
}

/** The card under `point` on the plane: a card before the group it sits in, the smaller group of two. */
export const cardAt = (
  nodes: readonly CanvasNode[],
  origin: Point,
  point: Point,
): CanvasNode | undefined =>
  nodes
    .map((node) => onPlane(node, origin))
    .filter(
      (one) =>
        point.x >= one.x &&
        point.x <= one.x + one.width &&
        point.y >= one.y &&
        point.y <= one.y + one.height,
    )
    .sort(
      (a, b) =>
        Number(a.type === 'group') - Number(b.type === 'group') ||
        a.width * a.height - b.width * b.height,
    )[0]
