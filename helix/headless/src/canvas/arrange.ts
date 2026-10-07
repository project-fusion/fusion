/**
 * Where `arrange()` puts every card: the arithmetic, kept apart from the board
 * that moves them there.
 */
import { type CanvasEdge, type CanvasNode, groupOf, reading } from './root/canvas-document.js'
import { snapTo } from './snap.js'

/** How a board is arranged. */
export interface CanvasArrangeOptions {
  /**
   * Which way the arrows run: `down` puts each card below the cards that point
   * to it, and `right` beside them. `down` by default.
   */
  direction?: 'down' | 'right'
  /** The space between two cards, in the document's own units. 64 by default. */
  gap?: number
}

/**
 * Where each card goes, by id, so that no two cards overlap.
 *
 * **Layers where there are connections.** A card goes one layer past the
 * furthest card that points to it, a connection that would close a loop is
 * read as pointing back, and the cards in each layer are ordered by where
 * the cards they connect to sit, so connections cross less. **A grid where
 * there are none**, in reading order, about as many columns as rows.
 *
 * A group is placed as one box and carries the cards inside it, so a card
 * stays in its group. What is arranged starts where the board's top left
 * corner was, and every place lands on a multiple of `snap` where it is set.
 */
export const arrangement = (
  nodes: readonly CanvasNode[],
  edges: readonly CanvasEdge[],
  options: CanvasArrangeOptions = {},
  snap?: number,
): Map<string, { x: number; y: number }> => {
  /* At least a step of the ruling, so two cards landing on it never meet. */
  const gap = Math.max(0, options.gap ?? 64, snap ?? 0)
  const across = options.direction === 'right'
  const groups = nodes.filter((node) => node.type === 'group')
  /* The outermost group around a card, which is what moves it. */
  const top = (node: CanvasNode): CanvasNode => {
    const seen = new Set([node])
    let at = node
    for (let held = groupOf(at, groups); held && !seen.has(held); held = groupOf(at, groups)) {
      seen.add(held)
      at = held
    }
    return at
  }
  const holder = new Map(nodes.map((node) => [node.id, top(node)]))
  const units = reading([...nodes], [], 'spatial').filter((node) => holder.get(node.id) === node)
  const order = new Map(units.map((unit, index) => [unit.id, index]))
  const into = new Map<string, Set<string>>()
  const out = new Map<string, Set<string>>()
  for (const edge of edges) {
    const from = holder.get(edge.fromNode)?.id
    const to = holder.get(edge.toNode)?.id
    if (from !== undefined && to !== undefined && from !== to) {
      out.set(from, (out.get(from) ?? new Set()).add(to))
      into.set(to, (into.get(to) ?? new Set()).add(from))
    }
  }

  /* Each unit's layer: the longest way to it, along connections that do not
     close a loop. A depth-first walk in reading order finds the ones that do. */
  const layer = new Map<string, number>()
  if (out.size === 0) {
    const columns = Math.ceil(Math.sqrt(units.length))
    for (const [index, unit] of units.entries()) {
      layer.set(unit.id, Math.floor(index / Math.max(columns, 1)))
    }
  } else {
    const done = new Set<string>()
    const open = new Set<string>()
    const back = new Set<string>()
    const visit = (id: string): void => {
      open.add(id)
      for (const next of out.get(id) ?? []) {
        if (open.has(next)) {
          back.add(`${id}>${next}`)
        } else if (!done.has(next)) {
          visit(next)
        }
      }
      open.delete(id)
      done.add(id)
    }
    for (const unit of units) {
      if (!done.has(unit.id) && !into.get(unit.id)?.size) {
        visit(unit.id)
      }
    }
    for (const unit of units) {
      if (!done.has(unit.id)) {
        visit(unit.id)
      }
    }
    const depth = (id: string, seen: Set<string>): number => {
      const known = layer.get(id)
      if (known !== undefined) {
        return known
      }
      seen.add(id)
      let deepest = 0
      for (const from of into.get(id) ?? []) {
        if (!back.has(`${from}>${id}`) && !seen.has(from)) {
          deepest = Math.max(deepest, depth(from, seen) + 1)
        }
      }
      layer.set(id, deepest)
      return deepest
    }
    for (const unit of units) {
      depth(unit.id, new Set())
    }
  }

  const layers: CanvasNode[][] = []
  for (const unit of units) {
    const at = layer.get(unit.id) ?? 0
    layers[at] = [...(layers[at] ?? []), unit]
  }
  /* Two sweeps, down and back up, each ordering a layer by the mean place of
     the units it connects to in the layer before. A unit with none keeps its
     place in reading order. */
  if (out.size > 0) {
    const place = new Map<string, number>()
    const settle = (row: CanvasNode[], near: Map<string, Set<string>>): void => {
      const mean = (unit: CanvasNode): number => {
        const known = [...(near.get(unit.id) ?? [])].filter((id) => place.has(id))
        return known.length === 0
          ? (order.get(unit.id) ?? 0) / Math.max(units.length, 1)
          : known.reduce((sum, id) => sum + (place.get(id) ?? 0), 0) / known.length
      }
      const means = new Map(row.map((unit) => [unit.id, mean(unit)]))
      row.sort((a, b) => (means.get(a.id) ?? 0) - (means.get(b.id) ?? 0))
      for (const [index, unit] of row.entries()) {
        place.set(unit.id, (index + 0.5) / row.length)
      }
    }
    for (const row of layers) {
      settle(row ?? [], into)
    }
    for (const row of [...layers].reverse()) {
      settle(row ?? [], out)
    }
  }

  /* Lengths along the arrows are `main`, lengths along a layer `cross`. */
  const main = (node: CanvasNode): number => (across ? node.width : node.height)
  const cross = (node: CanvasNode): number => (across ? node.height : node.width)
  const span = (row: CanvasNode[]): number =>
    row.reduce((sum, unit) => sum + cross(unit), 0) + gap * Math.max(row.length - 1, 0)
  const widest = Math.max(0, ...layers.map((row) => span(row ?? [])))
  const start = {
    x: Math.min(...units.map((unit) => unit.x)),
    y: Math.min(...units.map((unit) => unit.y)),
  }
  const moved = new Map<string, { x: number; y: number }>()
  let along = 0
  for (const row of layers) {
    if (!row) {
      continue
    }
    /* Grid rows start at the same edge; layers are centered on the widest. */
    let at = out.size === 0 ? 0 : (widest - span(row)) / 2
    for (const unit of row) {
      const x = snapTo(start.x + (across ? along : at), snap)
      const y = snapTo(start.y + (across ? at : along), snap)
      const dx = x - unit.x
      const dy = y - unit.y
      for (const node of nodes) {
        if (holder.get(node.id) === unit) {
          moved.set(node.id, { x: node.x + dx, y: node.y + dy })
        }
      }
      at += cross(unit) + gap
    }
    along += Math.max(...row.map(main)) + gap
  }
  /* A card that is in no unit, which only a group loop could make, stays. */
  for (const node of nodes) {
    if (!moved.has(node.id)) {
      moved.set(node.id, { x: node.x, y: node.y })
    }
  }
  return moved
}
