import type { GraphPoint, SeedLink } from './seed.js'

/** A note as the arrangement reads it: its group, if it has one. */
export interface ArrangedNode {
  group?: string | undefined
  id: string
}

/** The angle between one place and the next on a spiral: the golden angle, which never lines two up. */
const TURN = Math.PI * (3 - Math.sqrt(5))

/** The `at`th place on a spiral whose places are `spacing` apart. */
const spiral = (at: number, spacing: number): GraphPoint => ({
  x: Math.cos(at * TURN) * Math.sqrt(at + 0.5) * spacing,
  y: Math.sin(at * TURN) * Math.sqrt(at + 0.5) * spacing,
})

/**
 * Places for every note from the graph's structure alone, with no layout to
 * wait for: **each group around a circle, each hub in its group, and each
 * note beside the hub it hangs from**, the most connected note it links to
 * in its group.
 *
 * Not a layout to look at, since fans overlap and nothing is pushed apart:
 * it is where a stencil starts, which reads only which notes are near which,
 * so the shape is drawn from the first frame with each group a region and
 * each hub's notes around it.
 */
export const arrangeByGroup = (
  nodes: readonly ArrangedNode[],
  links: readonly SeedLink[],
): Map<string, GraphPoint> => {
  const groupOf = new Map(nodes.map((node) => [node.id, node.group ?? '']))
  const degree = new Map<string, number>()
  const neighbors = new Map<string, string[]>()
  const add = (from: string, to: string): void => {
    degree.set(from, (degree.get(from) ?? 0) + 1)
    const list = neighbors.get(from)
    if (list) {
      list.push(to)
    } else {
      neighbors.set(from, [to])
    }
  }
  for (const { source, target } of links) {
    if (groupOf.has(source) && groupOf.has(target)) {
      add(source, target)
      add(target, source)
    }
  }
  /* Each note hangs from its most connected neighbor in its group, where
     that neighbor is more connected than it is, and a note nothing is more
     connected than is a hub. Ties go to the earlier id, so a pair of equals
     does not hang from each other. */
  const rank = (id: string): number => degree.get(id) ?? 0
  const above = (one: string, other: string): boolean =>
    rank(one) > rank(other) || (rank(one) === rank(other) && one < other)
  const parent = new Map<string, string>()
  for (const { id } of nodes) {
    let best = id
    for (const near of neighbors.get(id) ?? []) {
      if (groupOf.get(near) === groupOf.get(id) && above(near, best)) {
        best = near
      }
    }
    parent.set(id, best)
  }
  const hubOf = (id: string): string => {
    let at = id
    while (parent.get(at) !== at) {
      at = parent.get(at) as string
    }
    /* Each note on the way points straight at the hub after, so a long chain is walked once. */
    let step = id
    while (step !== at) {
      const next = parent.get(step) as string
      parent.set(step, at)
      step = next
    }
    return at
  }
  /* Groups in the order their first notes were given, and each group's hubs
     with the notes that hang from them. */
  const groups = new Map<string, Map<string, string[]>>()
  for (const { id } of nodes) {
    const group = groupOf.get(id) as string
    const hubs = groups.get(group) ?? new Map<string, string[]>()
    groups.set(group, hubs)
    const hub = hubOf(id)
    const members = hubs.get(hub) ?? []
    hubs.set(hub, members)
    if (hub !== id) {
      members.push(id)
    }
  }
  const radiusOf = (hubs: Map<string, string[]>): number => {
    let count = 0
    for (const members of hubs.values()) {
      count += members.length + 1
    }
    return Math.sqrt(count) * 1.5
  }
  const radii = [...groups.values()].map(radiusOf)
  const widest = Math.max(0, ...radii)
  const ring = groups.size > 1 ? (widest * 1.2) / Math.sin(Math.PI / groups.size) : 0
  const positions = new Map<string, GraphPoint>()
  ;[...groups.values()].forEach((hubs, at) => {
    const turn = (at / groups.size) * Math.PI * 2
    const middle = { x: Math.cos(turn) * ring, y: Math.sin(turn) * ring }
    const ordered = [...hubs].sort(([, one], [, other]) => other.length - one.length)
    const mean = ordered.reduce((sum, [, members]) => sum + members.length + 1, 0) / ordered.length
    ordered.forEach(([hub, members], place) => {
      const spot = spiral(place, Math.sqrt(mean) * 2)
      const center = { x: middle.x + spot.x, y: middle.y + spot.y }
      positions.set(hub, center)
      members
        .sort((one, other) => rank(other) - rank(one))
        .forEach((member, step) => {
          const off = spiral(step + 1, 1)
          positions.set(member, { x: center.x + off.x, y: center.y + off.y })
        })
    })
  })
  return positions
}
