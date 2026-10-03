import { type GraphPoint, neighborsOf, type SeedLink, TURN } from './seed.js'

/** A note as the arrangement reads it: its group, if it has one. */
export interface ArrangedNode {
  group?: string | undefined
  id: string
}

/** The golden ratio's fraction, which steps a ball's places down it without lining two up. */
const STEP = (Math.sqrt(5) - 1) / 2

/**
 * The `at`th place on a spiral whose places are `spacing` apart, or, in a
 * solid, in a ball: each place in a direction of its own and as far out as
 * the room the places before it fill.
 */
const spiral = (at: number, spacing: number, solid: boolean): GraphPoint => {
  if (!solid) {
    return {
      x: Math.cos(at * TURN) * Math.sqrt(at + 0.5) * spacing,
      y: Math.sin(at * TURN) * Math.sqrt(at + 0.5) * spacing,
    }
  }
  const height = 1 - 2 * ((at * STEP) % 1)
  const around = Math.sqrt(1 - height * height)
  const out = Math.cbrt(at + 0.5) * spacing
  return {
    x: Math.cos(at * TURN) * around * out,
    y: height * out,
    z: Math.sin(at * TURN) * around * out,
  }
}

/** The `at`th of `count` directions spread evenly around a circle, or over a sphere in a solid. */
const around = (at: number, count: number, solid: boolean): GraphPoint => {
  if (!solid) {
    const turn = (at / count) * Math.PI * 2
    return { x: Math.cos(turn), y: Math.sin(turn) }
  }
  const height = 1 - (2 * (at + 0.5)) / count
  const ring = Math.sqrt(1 - height * height)
  return { x: Math.cos(at * TURN) * ring, y: height, z: Math.sin(at * TURN) * ring }
}

/** Two points added. */
const plus = (one: GraphPoint, other: GraphPoint): GraphPoint => ({
  x: one.x + other.x,
  y: one.y + other.y,
  ...(one.z === undefined && other.z === undefined ? {} : { z: (one.z ?? 0) + (other.z ?? 0) }),
})

/**
 * The hub each note hangs from, and how connected each note is: a note
 * hangs from its most connected neighbor in its group, where that neighbor
 * is more connected than it is, and the note at the end of the chain is the
 * hub. A note nothing is more connected than is its own hub.
 */
export const hubsOf = (
  nodes: readonly ArrangedNode[],
  links: readonly SeedLink[],
): { hubOf: (id: string) => string; rank: (id: string) => number } => {
  const groupOf = new Map(nodes.map((node) => [node.id, node.group ?? '']))
  const neighbors = neighborsOf(links, (id) => groupOf.has(id))
  /* Each note hangs from its most connected neighbor in its group, where
     that neighbor is more connected than it is, and a note nothing is more
     connected than is a hub. Ties go to the earlier id, so a pair of equals
     does not hang from each other. */
  const rank = (id: string): number => neighbors.get(id)?.length ?? 0
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
  return { hubOf, rank }
}

/**
 * Places for every note from the graph's structure alone, with no layout to
 * wait for: **each group around a circle, or a sphere in a solid, each hub in its group, and each
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
  {
    hubs = hubsOf(nodes, links),
    solid = false,
  }: {
    /** Each note's hub and the notes' ranks, where the caller worked them out already. */
    hubs?: ReturnType<typeof hubsOf>
    solid?: boolean
  } = {},
): Map<string, GraphPoint> => {
  const groupOf = new Map(nodes.map((node) => [node.id, node.group ?? '']))
  const { hubOf, rank } = hubs
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
    return (solid ? Math.cbrt(count) : Math.sqrt(count)) * 1.5
  }
  const radii = [...groups.values()].map(radiusOf)
  const widest = Math.max(0, ...radii)
  /* Far enough out that neighboring groups, a circle's or a sphere's share
     of the way around apart, do not overlap. */
  const ring =
    groups.size > 1
      ? solid
        ? (widest * 2.4) / Math.sqrt((4 * Math.PI) / groups.size)
        : (widest * 1.2) / Math.sin(Math.PI / groups.size)
      : 0
  const positions = new Map<string, GraphPoint>()
  ;[...groups.values()].forEach((hubs, at) => {
    const way = around(at, groups.size, solid)
    const middle = {
      x: way.x * ring,
      y: way.y * ring,
      ...(solid ? { z: (way.z ?? 0) * ring } : {}),
    }
    const ordered = [...hubs].sort(([, one], [, other]) => other.length - one.length)
    const mean = ordered.reduce((sum, [, members]) => sum + members.length + 1, 0) / ordered.length
    ordered.forEach(([hub, members], place) => {
      const center = plus(
        middle,
        spiral(place, (solid ? Math.cbrt(mean) : Math.sqrt(mean)) * 2, solid),
      )
      positions.set(hub, center)
      members
        .sort((one, other) => rank(other) - rank(one))
        .forEach((member, step) => {
          positions.set(member, plus(center, spiral(step + 1, 1, solid)))
        })
    })
  })
  return positions
}
