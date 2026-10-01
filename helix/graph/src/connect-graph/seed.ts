/** A point in the renderer's own units. */
export interface GraphPoint {
  x: number
  y: number
}

/** A note as the connector reads it off the frame. */
export interface SeedNode {
  id: string
  x?: number | undefined
  y?: number | undefined
}

/** A link as the connector reads it off the frame. */
export interface SeedLink {
  source: string
  target: string
}

/** The angle between one note and the next on the spiral: the golden angle, which never lines two up. */
const TURN = Math.PI * (3 - Math.sqrt(5))

/** How far a note starts from a placed neighbor, in the spiral's units. */
const NEAR = 0.5

/**
 * A small, stable offset for a note, read from its `id`, so a note placed
 * beside a neighbor lands in the same spot on every load and two notes placed
 * beside one neighbor do not land on each other.
 */
const nudge = (id: string): GraphPoint => {
  let hash = 2166136261
  for (let at = 0; at < id.length; at++) {
    hash = Math.imul(hash ^ id.charCodeAt(at), 16777619)
  }
  const angle = ((hash >>> 0) / 4294967296) * Math.PI * 2
  return { x: Math.cos(angle) * NEAR, y: Math.sin(angle) * NEAR }
}

/**
 * Where each note starts, and which of them a layout still has to place.
 *
 * **Kept where it is known.** A note's own `x` and `y` win, then where the
 * last layout put it, so a page that adds one note does not watch the rest
 * of the graph jump. A new note starts beside a placed neighbor, which is
 * close to where a layout will want it, and a note with none starts on a
 * spiral around the middle, in the order it was given. Nothing is random, so
 * the same graph starts the same way on every load.
 */
export const seedPositions = (
  nodes: readonly SeedNode[],
  links: readonly SeedLink[],
  known: ReadonlyMap<string, GraphPoint> = new Map(),
): { positions: Map<string, GraphPoint>; unplaced: Set<string> } => {
  const positions = new Map<string, GraphPoint>()
  const unplaced = new Set<string>()
  for (const node of nodes) {
    if (Number.isFinite(node.x) && Number.isFinite(node.y)) {
      positions.set(node.id, { x: node.x as number, y: node.y as number })
    } else {
      const kept = known.get(node.id)
      if (kept) {
        positions.set(node.id, { ...kept })
      }
    }
  }
  const neighbors = new Map<string, string[]>()
  for (const { source, target } of links) {
    neighbors.set(source, [...(neighbors.get(source) ?? []), target])
    neighbors.set(target, [...(neighbors.get(target) ?? []), source])
  }
  let spiral = positions.size
  for (const node of nodes) {
    if (positions.has(node.id)) {
      continue
    }
    unplaced.add(node.id)
    const placed = (neighbors.get(node.id) ?? []).find((one) => positions.has(one))
    const beside = placed === undefined ? undefined : positions.get(placed)
    if (beside) {
      const offset = nudge(node.id)
      positions.set(node.id, { x: beside.x + offset.x, y: beside.y + offset.y })
      continue
    }
    const radius = Math.sqrt(spiral + 0.5)
    const angle = spiral * TURN
    positions.set(node.id, { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius })
    spiral += 1
  }
  return { positions, unplaced }
}
