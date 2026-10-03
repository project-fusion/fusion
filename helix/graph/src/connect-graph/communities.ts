/**
 * Groups found in the links, for a graph whose notes carry none.
 *
 * **Louvain**, which moves each note to the neighboring community that raises
 * the graph's modularity most, then folds each community into one note and
 * moves those, until nothing moves. Written here, not taken from a package,
 * so it costs a page no dependency and runs for every renderer: it reads the
 * notes and links a page hands the frame, and gives back notes with a `group`.
 *
 * **The same communities on every load.** Notes are visited in the order the
 * page gives them and a tie keeps the community a note is in, so nothing
 * random decides where a note lands.
 */

/** A link, as the frame takes it. */
interface Link {
  source: string
  target: string
}

/** A note, as the frame takes it, as far as communities read it. */
interface Note {
  group?: string | undefined
  id: string
  label?: string | undefined
}

/**
 * One level of the graph: each node's neighbors with the weight to each, and
 * its degree, which counts the links folded inside it as well.
 */
interface Level {
  degree: number[]
  near: Map<number, number>[]
}

/** How much a move has to raise modularity by to count, so rounding never moves a note back and forth. */
const GAIN = 1e-12

/** At most this many passes over one level, so a graph that never settles still ends. */
const PASSES = 32

/** Adds to one entry of a list of sums. */
const add = (list: number[], at: number, by: number): void => {
  list[at] = (list[at] ?? 0) + by
}

/** Moves each node to the community that raises modularity most, and says whether any moved. */
const settle = (level: Level, total: number, community: number[]): boolean => {
  const count = level.degree.length
  const sums = new Array<number>(count).fill(0)
  for (let node = 0; node < count; node++) {
    add(sums, community[node] as number, level.degree[node] as number)
  }
  let movedAtAll = false
  for (let pass = 0; pass < PASSES; pass++) {
    let moved = false
    for (let node = 0; node < count; node++) {
      const own = community[node] as number
      const degree = level.degree[node] as number
      /* The weight from this node to each neighboring community. */
      const toward = new Map<number, number>()
      for (const [other, weight] of level.near[node] as Map<number, number>) {
        const at = community[other] as number
        toward.set(at, (toward.get(at) ?? 0) + weight)
      }
      add(sums, own, -degree)
      let best = own
      let bestGain = (toward.get(own) ?? 0) - ((sums[own] as number) * degree) / total
      for (const [at, weight] of toward) {
        const gain = weight - ((sums[at] as number) * degree) / total
        if (gain > bestGain + GAIN) {
          best = at
          bestGain = gain
        }
      }
      add(sums, best, degree)
      if (best !== own) {
        community[node] = best
        moved = true
        movedAtAll = true
      }
    }
    if (!moved) {
      break
    }
  }
  return movedAtAll
}

/** Each node's community, numbered from 0 in the order the communities first appear. */
const renumber = (community: number[]): number[] => {
  const numbers = new Map<number, number>()
  return community.map((at) => {
    let number = numbers.get(at)
    if (number === undefined) {
      number = numbers.size
      numbers.set(at, number)
    }
    return number
  })
}

/** The next level: each community folded into one node, the links between them summed. */
const fold = (level: Level, community: number[], count: number): Level => {
  const near = Array.from({ length: count }, () => new Map<number, number>())
  const degree = new Array<number>(count).fill(0)
  level.near.forEach((neighbors, node) => {
    const from = community[node] as number
    add(degree, from, level.degree[node] as number)
    /* A link inside a community folds into it and is no one's neighbor. */
    for (const [other, weight] of neighbors) {
      const to = community[other] as number
      if (to !== from) {
        const ofFrom = near[from] as Map<number, number>
        ofFrom.set(to, (ofFrom.get(to) ?? 0) + weight)
      }
    }
  })
  return { degree, near }
}

/**
 * Each note's community, by `id`, numbered from 0 in the order the
 * communities first appear among the notes. A note no link touches is a
 * community of its own.
 */
export const communitiesOf = (
  ids: readonly string[],
  links: readonly Link[],
): Map<string, number> => {
  const index = new Map(ids.map((id, at) => [id, at]))
  const near = ids.map(() => new Map<number, number>())
  const degree = new Array<number>(ids.length).fill(0)
  for (const { source, target } of links) {
    const from = index.get(source)
    const to = index.get(target)
    if (from === undefined || to === undefined || from === to) {
      continue
    }
    /* Undirected: a link either way is the same tie, and two links are twice one. */
    const ofFrom = near[from] as Map<number, number>
    const ofTo = near[to] as Map<number, number>
    ofFrom.set(to, (ofFrom.get(to) ?? 0) + 1)
    ofTo.set(from, (ofTo.get(from) ?? 0) + 1)
    add(degree, from, 1)
    add(degree, to, 1)
  }
  const total = degree.reduce((sum, one) => sum + one, 0)
  /* Where each original note is, carried down through every fold. */
  let placed = ids.map((_, at) => at)
  if (total === 0) {
    return new Map(ids.map((id, at) => [id, at]))
  }
  let level: Level = { degree, near }
  for (;;) {
    const community = level.degree.map((_, at) => at)
    if (!settle(level, total, community)) {
      break
    }
    const numbered = renumber(community)
    const count = Math.max(...numbered) + 1
    placed = placed.map((at) => numbered[at] as number)
    if (count === level.degree.length) {
      break
    }
    level = fold(level, numbered, count)
  }
  const final = renumber(placed)
  return new Map(ids.map((id, at) => [id, final[at] as number]))
}

/** How `groupByCommunity` names and gathers what it finds. */
export interface GroupByCommunityOptions {
  /**
   * The fewest notes a community needs to be a group of its own. Smaller ones
   * share one group, named by `rest`, so a scatter of loose notes is one name
   * in the legend and not hundreds. 3 by default.
   */
  fewest?: number | undefined
  /** The group the small communities share. `Other` by default. */
  rest?: string | undefined
}

/**
 * The notes, each without a group given one from the communities its links
 * form, **named after its community's most linked note**, so a reader sees
 * "Pricing" over the cluster around Pricing. A note with a group keeps it.
 * Hand the result to the frame as its `nodes`; the drawing colors the groups
 * and a `legend` names them.
 */
export const groupByCommunity = <T extends Note>(
  nodes: readonly T[],
  links: readonly Link[],
  options: GroupByCommunityOptions = {},
): (T & { group: string })[] => {
  const fewest = options.fewest ?? 3
  const rest = options.rest ?? 'Other'
  const found = communitiesOf(
    nodes.map((node) => node.id),
    links,
  )
  const degree = new Map<string, number>()
  for (const { source, target } of links) {
    if (source !== target) {
      degree.set(source, (degree.get(source) ?? 0) + 1)
      degree.set(target, (degree.get(target) ?? 0) + 1)
    }
  }
  /* Each community's notes, and its most linked one: the first, where two tie. */
  const members = new Map<number, T[]>()
  for (const node of nodes) {
    const at = found.get(node.id) as number
    const list = members.get(at)
    if (list) {
      list.push(node)
    } else {
      members.set(at, [node])
    }
  }
  const names = new Map<number, string>()
  const taken = new Set(nodes.flatMap((node) => (node.group ? [node.group] : [])))
  for (const [at, list] of members) {
    if (list.length < fewest) {
      names.set(at, rest)
      continue
    }
    const hub = list.reduce((best, node) =>
      (degree.get(node.id) ?? 0) > (degree.get(best.id) ?? 0) ? node : best,
    )
    const base = hub.label || hub.id
    let name = base
    /* Two hubs with one name, or a name a given group already has, kept apart. */
    for (let number = 2; taken.has(name) || name === rest; number++) {
      name = `${base} ${number}`
    }
    taken.add(name)
    names.set(at, name)
  }
  return nodes.map((node) => ({
    ...node,
    group: node.group || (names.get(found.get(node.id) as number) as string),
  }))
}
