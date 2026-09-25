/**
 * The JSON Canvas document, and the reading of it this family does.
 *
 * [JSON Canvas](https://jsoncanvas.org) is an open format: a node carries `x`,
 * `y`, `width`, `height` and a type, and an edge names the two nodes and,
 * optionally, the side it leaves and arrives on. **Position is data here**,
 * which is the whole reason this family draws and `Map` does not: somebody
 * placed every card and the placement carries the meaning, so there is no
 * layout to compute and drawing it is arithmetic.
 */

/** Which edge of a card a connector leaves from or arrives at. */
export type CanvasSide = 'top' | 'right' | 'bottom' | 'left'

/** One card, group or link on the board. */
export interface CanvasNode {
  /** What identifies it, and what an edge names. */
  id: string
  /** Whatever the card says, where it says anything. */
  text?: string | undefined
  /** What it is: a card of text, a file, a link, or a box around others. */
  type: 'text' | 'file' | 'link' | 'group'
  x: number
  y: number
  width: number
  height: number
  /** A preset from `1` to `6`, or a hex color the document chose itself. */
  color?: string | undefined
  /** The file it stands for, where it is one. */
  file?: string | undefined
  /** The address it points at, where it is one. */
  url?: string | undefined
  /** What the group is called. */
  label?: string | undefined
  /** Where in the file it points, a heading or a block, starting with `#`. */
  subpath?: string | undefined
  /** The picture behind a group, where it has one. */
  background?: string | undefined
  /** How that picture fills the group: `cover`, `ratio` or `repeat`. */
  backgroundStyle?: 'cover' | 'ratio' | 'repeat' | undefined
}

/** What a connector carries at an end: an arrowhead, or nothing. */
export type CanvasEnd = 'none' | 'arrow'

/** One connector between two nodes. */
export interface CanvasEdge {
  id: string
  fromNode: string
  toNode: string
  fromSide?: CanvasSide | undefined
  toSide?: CanvasSide | undefined
  /**
   * What sits at the end it leaves from. Absent is nothing, which is the
   * format's own default and what makes an ordinary edge a one-way arrow.
   */
  fromEnd?: CanvasEnd | undefined
  /** What sits at the end it arrives at. Absent is an arrow, as the format says. */
  toEnd?: CanvasEnd | undefined
  color?: string | undefined
  label?: string | undefined
  /** How it travels, where it says; the board's own default where it does not. */
  path?: CanvasPath | undefined
}

/** A whole board. */
export interface CanvasDocument {
  nodes?: CanvasNode[]
  edges?: CanvasEdge[]
}

/** A rectangle in the document's own coordinates. */
interface Box {
  x: number
  y: number
  width: number
  height: number
}

/** Whether the inner box sits inside the outer one. */
export const inside = (inner: Box, outer: Box): boolean =>
  inner.x >= outer.x &&
  inner.y >= outer.y &&
  inner.x + inner.width <= outer.x + outer.width &&
  inner.y + inner.height <= outer.y + outer.height

/**
 * Which group a node belongs to, which the format does not say and the geometry
 * does.
 *
 * **The smallest group that contains it**, because groups nest: a card inside a
 * group inside a group belongs to the inner one, and taking the first match
 * would hand it to whichever was written first. A group never belongs to
 * itself.
 */
export const groupOf = (node: CanvasNode, nodes: CanvasNode[]): CanvasNode | undefined => {
  let held: CanvasNode | undefined
  for (const other of nodes) {
    if (other.type !== 'group' || other.id === node.id || !inside(node, other)) {
      continue
    }
    if (!held || other.width * other.height < held.width * held.height) {
      held = other
    }
  }
  return held
}

/** The whole board's extent, which is what the plane is sized to. */
export const extent = (nodes: CanvasNode[]): Box => {
  if (nodes.length === 0) {
    return { height: 0, width: 0, x: 0, y: 0 }
  }
  const x = Math.min(...nodes.map((one) => one.x))
  const y = Math.min(...nodes.map((one) => one.y))
  const right = Math.max(...nodes.map((one) => one.x + one.width))
  const bottom = Math.max(...nodes.map((one) => one.y + one.height))
  return { height: bottom - y, width: right - x, x, y }
}

/** The point an edge leaves from or arrives at, on a named side. */
export const port = (node: CanvasNode, side: CanvasSide): { x: number; y: number } => {
  const midX = node.x + node.width / 2
  const midY = node.y + node.height / 2
  if (side === 'top') {
    return { x: midX, y: node.y }
  }
  if (side === 'bottom') {
    return { x: midX, y: node.y + node.height }
  }
  if (side === 'left') {
    return { x: node.x, y: midY }
  }
  return { x: node.x + node.width, y: midY }
}

/**
 * Which side an edge uses when the document does not say.
 *
 * The format makes `fromSide` and `toSide` optional, and a connector drawn from
 * a fixed side would cross its own card half the time. The axis with the larger
 * gap wins, which is what a person drawing the line by hand would pick.
 */
const nearestSides = (from: CanvasNode, to: CanvasNode): [CanvasSide, CanvasSide] => {
  const acrossX = to.x + to.width / 2 - (from.x + from.width / 2)
  const acrossY = to.y + to.height / 2 - (from.y + from.height / 2)
  if (Math.abs(acrossX) >= Math.abs(acrossY)) {
    return acrossX >= 0 ? ['right', 'left'] : ['left', 'right']
  }
  return acrossY >= 0 ? ['bottom', 'top'] : ['top', 'bottom']
}

/** How a connector travels between the two cards it joins. */
export type CanvasPath = 'curve' | 'straight' | 'step'

/** The unit step out of a side, which is where a connector leaves it. */
const normal = (side: CanvasSide): { x: number; y: number } => ({
  x: side === 'left' ? -1 : side === 'right' ? 1 : 0,
  y: side === 'top' ? -1 : side === 'bottom' ? 1 : 0,
})

/**
 * How far a stepped connector runs straight out of a side before it turns.
 *
 * Enough that the first corner is clear of the card and the arrowhead at the
 * far end sits on a straight run rather than on a bend.
 */
const STUB = 20

/** How round a stepped connector's corners are. */
const RADIUS = 8

/** A point in the document's own units. */
type Point = { x: number; y: number }

/** Each segment of a run of points, as its two ends. */
const segments = (points: Point[]): Array<[Point, Point]> =>
  points.slice(1).map((point, index) => [points[index] ?? point, point])

/** The point partway along a run of straight segments, by length. */
const along = (points: Point[], share: number): Point => {
  const runs = segments(points).map(([from, to]) => ({
    from,
    length: Math.hypot(to.x - from.x, to.y - from.y),
    to,
  }))
  let left = runs.reduce((sum, one) => sum + one.length, 0) * share
  for (const { from, length, to } of runs) {
    if (left <= length && length > 0) {
      return {
        x: from.x + ((to.x - from.x) * left) / length,
        y: from.y + ((to.y - from.y) * left) / length,
      }
    }
    left -= length
  }
  return points[points.length - 1] ?? { x: 0, y: 0 }
}

/**
 * A run of right angles, each corner rounded.
 *
 * **Rounded because a square corner reads as a circuit diagram**, which a
 * board is not, and the radius shrinks to fit a short segment so a corner never
 * overshoots the run it is turning out of.
 */
const rounded = (points: Point[]): string => {
  const first = points[0] ?? { x: 0, y: 0 }
  const last = points[points.length - 1] ?? first
  const corners = points
    .slice(1, -1)
    .map((corner, index) => {
      const before = points[index] ?? corner
      const after = points[index + 2] ?? corner
      const inLength = Math.hypot(corner.x - before.x, corner.y - before.y)
      const outLength = Math.hypot(after.x - corner.x, after.y - corner.y)
      const radius = Math.min(RADIUS, inLength / 2, outLength / 2)
      const enter = {
        x: corner.x - ((corner.x - before.x) / (inLength || 1)) * radius,
        y: corner.y - ((corner.y - before.y) / (inLength || 1)) * radius,
      }
      const leave = {
        x: corner.x + ((after.x - corner.x) / (outLength || 1)) * radius,
        y: corner.y + ((after.y - corner.y) / (outLength || 1)) * radius,
      }
      return ` L ${enter.x} ${enter.y} Q ${corner.x} ${corner.y} ${leave.x} ${leave.y}`
    })
    .join('')
  return `M ${first.x} ${first.y}${corners} L ${last.x} ${last.y}`
}

/**
 * The corners of a stepped connector, from one side to the other.
 *
 * Out of each side by a stub, then joined with right angles: a turn halfway
 * between the two where both run the same way, one corner where they cross.
 * **No path-finding**, which is a decision: a step that turns halfway can cross
 * a card between the two it joins, and routing around every card is a layout
 * engine rather than a line.
 */
const steps = (start: Point, fromSide: CanvasSide, end: Point, toSide: CanvasSide): Point[] => {
  const out = normal(fromSide)
  const into = normal(toSide)
  const a = { x: start.x + out.x * STUB, y: start.y + out.y * STUB }
  const b = { x: end.x + into.x * STUB, y: end.y + into.y * STUB }
  const across = (side: CanvasSide) => side === 'left' || side === 'right'
  let middle: Point[]
  if (across(fromSide) && across(toSide)) {
    const x = (a.x + b.x) / 2
    middle = [
      { x, y: a.y },
      { x, y: b.y },
    ]
  } else if (!across(fromSide) && !across(toSide)) {
    const y = (a.y + b.y) / 2
    middle = [
      { x: a.x, y },
      { x: b.x, y },
    ]
  } else if (across(fromSide)) {
    middle = [{ x: b.x, y: a.y }]
  } else {
    middle = [{ x: a.x, y: b.y }]
  }
  /* Consecutive points that coincide, or that sit on one line, are not
     corners: rounding one draws a kink in a straight run. */
  const all = [start, a, ...middle, b, end]
  return all.filter((point, at) => {
    if (at === 0 || at === all.length - 1) {
      return true
    }
    const before = all[at - 1] ?? point
    const after = all[at + 1] ?? point
    const same = point.x === before.x && point.y === before.y
    /* Straight means carrying on the same way, not merely staying on one
       line: a connection leaving the right of a card for the left of one
       behind it turns back on itself, and dropping that point lost the stub
       out of each side and ran the line straight through both cards. */
    const into = { x: Math.sign(point.x - before.x), y: Math.sign(point.y - before.y) }
    const onward = { x: Math.sign(after.x - point.x), y: Math.sign(after.y - point.y) }
    const straight = into.x === onward.x && into.y === onward.y
    return !same && !straight
  })
}

/**
 * The path one connector is drawn along, in board coordinates.
 *
 * **A curve by default**: the control points sit out along the normal of each
 * side, so a connector leaves a card square to the edge it named and arrives
 * the same way, which is what makes the two ends read as attached rather than
 * aimed. `straight` is the shortest line between the two sides, and `step`
 * turns in right angles, which is what a flowchart reads as.
 */
export const connector = (
  edge: CanvasEdge,
  from: CanvasNode,
  to: CanvasNode,
  path: CanvasPath = 'curve',
  heads: { start: boolean; end: boolean } = { end: false, start: false },
): { d: string; mid: { x: number; y: number } } => {
  const { end: port2, fromSide, start: port1, toSide } = ends(edge, from, to)
  /* **The line stops where the head starts.** Drawn to the card and capped with
     a head, the stroke ran on under the head to its tip, and where the head
     narrowed to its point the line was the wider of the two: a line thickened
     on hover poked out either side of its own arrow. So an end with a head is
     drawn to the head's base, a head's length out along the way it arrives,
     and the head covers the rest. */
  const inward = (point: Point, side: CanvasSide, other: Point): Point => {
    if (path === 'straight') {
      const length = Math.hypot(other.x - point.x, other.y - point.y) || 1
      return {
        x: point.x + ((other.x - point.x) / length) * HEAD,
        y: point.y + ((other.y - point.y) / length) * HEAD,
      }
    }
    return { x: point.x + normal(side).x * HEAD, y: point.y + normal(side).y * HEAD }
  }
  const start = heads.start ? inward(port1, fromSide, port2) : port1
  const end = heads.end ? inward(port2, toSide, port1) : port2
  if (path === 'straight') {
    return {
      d: `M ${start.x} ${start.y} L ${end.x} ${end.y}`,
      mid: { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 },
    }
  }
  if (path === 'step') {
    const points = steps(start, fromSide, end, toSide)
    return { d: rounded(points), mid: along(points, 0.5) }
  }
  const reach = Math.max(40, Math.hypot(end.x - start.x, end.y - start.y) / 3)
  const c1 = { x: start.x + normal(fromSide).x * reach, y: start.y + normal(fromSide).y * reach }
  const c2 = { x: end.x + normal(toSide).x * reach, y: end.y + normal(toSide).y * reach }
  return {
    d: `M ${start.x} ${start.y} C ${c1.x} ${c1.y} ${c2.x} ${c2.y} ${end.x} ${end.y}`,
    /* The label sits at the curve's midpoint, which for a symmetric cubic is
       the average of the ends and the controls rather than of the ends. */
    mid: { x: (start.x + end.x + c1.x + c2.x) / 4, y: (start.y + end.y + c1.y + c2.y) / 4 },
  }
}

/** How long an arrowhead is, in the document's own units. */
export const HEAD = 8

/**
 * Where a connection meets each card, and on which side: the sides it names,
 * and the nearest where it names none.
 */
export const ends = (
  edge: CanvasEdge,
  from: CanvasNode,
  to: CanvasNode,
): { start: Point; end: Point; fromSide: CanvasSide; toSide: CanvasSide } => {
  const [fallbackFrom, fallbackTo] = nearestSides(from, to)
  const fromSide = edge.fromSide ?? fallbackFrom
  const toSide = edge.toSide ?? fallbackTo
  return { end: port(to, toSide), fromSide, start: port(from, fromSide), toSide }
}

/**
 * The side of a card nearest a point, which is where a connection a reader is
 * holding arrives.
 *
 * **The reader's point, not the card's middle.** A connection dropped on a card
 * arrived at whichever side faced the card it came from, so a reader aiming for
 * the top of a card watched it land on the left.
 */
export const sideNear = (node: CanvasNode, point: Point): CanvasSide =>
  (['top', 'right', 'bottom', 'left'] as const)
    .map((side) => {
      const at = port(node, side)
      return { distance: Math.hypot(at.x - point.x, at.y - point.y), side }
    })
    .sort((a, b) => a.distance - b.distance)[0]?.side ?? 'top'

/**
 * The order a screen reader meets the cards in, which space does not supply.
 *
 * **Spatial is a heuristic and says so.** Cards are banded into rows by their
 * top edge, then read left to right within a row, groups before what they hold,
 * which is how a person reads a board that was laid out on a grid. A loose
 * board defeats it, which is why `edges` exists.
 *
 * **Edges is the arrows.** It starts at the cards nothing points to and follows
 * the connectors, which on a board that *is* a flow is the order its author
 * meant. Anything unreachable follows in spatial order, or a card nobody linked
 * would vanish from the list that exists to find it.
 */
export const reading = (
  nodes: CanvasNode[],
  edges: CanvasEdge[],
  order: 'spatial' | 'edges',
): CanvasNode[] => {
  const band = 80
  const byPlace = (a: CanvasNode, b: CanvasNode): number => {
    const rowA = Math.round(a.y / band)
    const rowB = Math.round(b.y / band)
    return rowA === rowB ? a.x - b.x : rowA - rowB
  }
  /* **A group is read where it sits, and what it holds straight after it.**
     Sorting every group ahead of every card read a group at the foot of the
     board before the title at its head, and then the title between the group
     and its own cards. */
  const groups = nodes.filter((node) => node.type === 'group')
  const holder = new Map(nodes.map((node) => [node.id, groupOf(node, groups)?.id]))
  const members = new Map<string | undefined, CanvasNode[]>()
  for (const node of nodes) {
    const id = holder.get(node.id)
    members.set(id, [...(members.get(id) ?? []), node])
  }
  const held = (id: string | undefined): CanvasNode[] => (members.get(id) ?? []).sort(byPlace)
  const spatial: CanvasNode[] = []
  const placed = new Set<string>()
  const visit = (node: CanvasNode): void => {
    if (placed.has(node.id)) {
      return
    }
    placed.add(node.id)
    spatial.push(node)
    if (node.type === 'group') {
      for (const inner of held(node.id)) {
        visit(inner)
      }
    }
  }
  for (const node of held(undefined)) {
    visit(node)
  }
  /* Two groups drawn as the same box each hold the other, so neither is at
     the top: they are read in place rather than lost. */
  for (const node of [...nodes].sort(byPlace)) {
    visit(node)
  }
  if (order === 'spatial') {
    return spatial
  }

  const pointedAt = new Set(edges.map((one) => one.toNode))
  const out = new Map<string, string[]>()
  for (const edge of edges) {
    out.set(edge.fromNode, [...(out.get(edge.fromNode) ?? []), edge.toNode])
  }
  const byId = new Map(nodes.map((one) => [one.id, one]))
  const seen = new Set<string>()
  const walked: CanvasNode[] = []
  const walk = (id: string): void => {
    if (seen.has(id)) {
      return
    }
    seen.add(id)
    const node = byId.get(id)
    if (node) {
      walked.push(node)
    }
    for (const next of out.get(id) ?? []) {
      walk(next)
    }
  }
  for (const node of spatial.filter((one) => !pointedAt.has(one.id))) {
    walk(node.id)
  }
  /* Everything the arrows never reached, which is every card on a board with no
     edges at all and the islands on one with some. */
  return [...walked, ...spatial.filter((one) => !seen.has(one.id))]
}

/** A card as the elements take it: attributes, and the text to put inside. */
export interface CanvasNodeProps {
  name: string
  x: number
  y: number
  width: number
  height: number
  /** What it means, from the format's six presets. */
  tone?: CanvasTone | undefined
  /** A color the document chose that is none of the six, to set as `--canvas-node-color`. */
  color?: string | undefined
  label?: string | undefined
  group: boolean
  /** What the card says, for a card of text. */
  text?: string | undefined
  /** The file it stands for, for a card that is one. */
  file?: string | undefined
  /** The address it points at, for a card that is a link. */
  url?: string | undefined
  /** Where in the file it points, for a card that is one. */
  subpath?: string | undefined
  /** The picture behind a group, and how it fills it. */
  background?: string | undefined
  backgroundStyle?: 'cover' | 'ratio' | 'repeat' | undefined
}

/** A connection as the elements take it. */
export interface CanvasEdgeProps {
  name: string
  from: string
  to: string
  fromSide?: CanvasSide | undefined
  toSide?: CanvasSide | undefined
  fromEnd?: CanvasEnd | undefined
  toEnd?: CanvasEnd | undefined
  /** What it means, from the format's six presets. */
  tone?: CanvasTone | undefined
  /** A color the document chose that is none of the six, to set as `--canvas-edge-color`. */
  color?: string | undefined
  label?: string | undefined
}

/**
 * A JSON Canvas document as the props of the elements that draw it.
 *
 * **Props rather than elements**, because what a card holds is the consumer's
 * to render: a text card is text, a file card is whatever they show for that
 * file, a link card is the link as they want it drawn. So this does the half
 * that is mapping, ids to names and types to `group`, and hands back the
 * content for the consumer to put inside, in whichever renderer they use.
 */
export const fromJsonCanvas = (
  document: CanvasDocument,
): { nodes: CanvasNodeProps[]; edges: CanvasEdgeProps[] } => ({
  edges: (document.edges ?? []).map((edge) => ({
    color: toneOf(edge.color) === undefined ? edge.color : undefined,
    from: edge.fromNode,
    fromEnd: edge.fromEnd,
    fromSide: edge.fromSide,
    label: edge.label,
    name: edge.id,
    to: edge.toNode,
    toEnd: edge.toEnd,
    tone: toneOf(edge.color),
    toSide: edge.toSide,
  })),
  nodes: (document.nodes ?? []).map((node) => ({
    background: node.background,
    backgroundStyle: node.backgroundStyle,
    color: toneOf(node.color) === undefined ? node.color : undefined,
    file: node.file,
    group: node.type === 'group',
    height: node.height,
    label: node.label,
    name: node.id,
    subpath: node.subpath,
    text: node.text,
    tone: toneOf(node.color),
    url: node.url,
    width: node.width,
    x: node.x,
    y: node.y,
  })),
})

/** What every Helix component calls a meaning. */
export type CanvasTone =
  | 'accent'
  | 'danger'
  | 'info'
  | 'neutral'
  | 'primary'
  | 'success'
  | 'warning'

/**
 * The format's six presets, in order, as the tones they have always meant here.
 *
 * JSON Canvas leaves what `1` to `6` mean to the application, and this board
 * pointed them at these from the start; the mapping is written once, so the way
 * in and the way out cannot disagree.
 */
const PRESETS: readonly CanvasTone[] = ['danger', 'warning', 'accent', 'success', 'info', 'primary']

/** The tone a JSON Canvas color means, where it is one of the six presets. */
export const toneOf = (color: string | undefined): CanvasTone | undefined =>
  color !== undefined && /^[1-6]$/.test(color) ? PRESETS[Number(color) - 1] : undefined

/**
 * The JSON Canvas color a card or connection writes back out: its tone as a
 * preset, or the custom color it was given, or nothing.
 */
export const colorOf = (tone: CanvasTone | undefined, custom: string): string | undefined => {
  const at = tone === undefined ? -1 : PRESETS.indexOf(tone)
  return at >= 0 ? String(at + 1) : custom.trim() || undefined
}
