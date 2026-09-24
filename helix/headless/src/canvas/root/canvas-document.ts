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
const inside = (inner: Box, outer: Box): boolean =>
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
const port = (node: CanvasNode, side: CanvasSide): { x: number; y: number } => {
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

/**
 * The path one connector is drawn along, in board coordinates.
 *
 * A cubic curve rather than a straight line or an elbow: the control points sit
 * out along the normal of each side, so a connector leaves a card square to the
 * edge it named and arrives the same way, which is what makes the two ends read
 * as attached rather than aimed.
 */
export const connector = (
  edge: CanvasEdge,
  from: CanvasNode,
  to: CanvasNode,
): { d: string; mid: { x: number; y: number } } => {
  const [fallbackFrom, fallbackTo] = nearestSides(from, to)
  const fromSide = edge.fromSide ?? fallbackFrom
  const toSide = edge.toSide ?? fallbackTo
  const start = port(from, fromSide)
  const end = port(to, toSide)
  const reach = Math.max(40, Math.hypot(end.x - start.x, end.y - start.y) / 3)
  const out = (side: CanvasSide, point: { x: number; y: number }) => ({
    x: point.x + (side === 'left' ? -reach : side === 'right' ? reach : 0),
    y: point.y + (side === 'top' ? -reach : side === 'bottom' ? reach : 0),
  })
  const c1 = out(fromSide, start)
  const c2 = out(toSide, end)
  return {
    d: `M ${start.x} ${start.y} C ${c1.x} ${c1.y} ${c2.x} ${c2.y} ${end.x} ${end.y}`,
    /* The label sits at the curve's midpoint, which for a symmetric cubic is
       the average of the ends and the controls rather than of the ends. */
    mid: { x: (start.x + end.x + c1.x + c2.x) / 4, y: (start.y + end.y + c1.y + c2.y) / 4 },
  }
}

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
  const spatial = [...nodes].sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === 'group' ? -1 : b.type === 'group' ? 1 : 0
    }
    const rowA = Math.round(a.y / band)
    const rowB = Math.round(b.y / band)
    return rowA === rowB ? a.x - b.x : rowA - rowB
  })
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
