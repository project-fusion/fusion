/** A note as the renderer draws it, placed. */
export interface DrawnNode {
  /** The note's `id`, as the frame holds it. */
  id: string
  /** The name drawn beside it: its `label`, or its `id` where it has none. */
  label: string
  /** How large it is drawn, relative to the others: the note's `size`, or from how many links it has. */
  size: number
  /** Across, in the renderer's own units. */
  x: number
  /** Up, in the renderer's own units. */
  y: number
  /** How near the viewer, for a renderer that draws in three dimensions. */
  z?: number | undefined
}

/** A link as the renderer draws it, between two notes the graph holds. */
export interface DrawnLink {
  /** What the link says, where it says anything. */
  label?: string | undefined
  /** The `id` of the note the link runs from. */
  source: string
  /** The `id` of the note the link runs to. */
  target: string
}

/** What changed between two drawings of a graph, which a renderer applies in place. */
export interface GraphChanges {
  /** Links to draw that were not drawn. */
  addLinks: DrawnLink[]
  /** Notes to draw that were not drawn, placed. */
  addNodes: DrawnNode[]
  /** Notes still drawn whose name, size or place changed. */
  changeNodes: DrawnNode[]
  /** Links no longer drawn. */
  removeLinks: DrawnLink[]
  /** Notes no longer drawn, by `id`. */
  removeNodes: string[]
}

/** A link's key: its two ends, which no `id` can contain both of by accident. */
export const linkKey = (link: { source: string; target: string }): string =>
  `${link.source}\u0000${link.target}`

/** Whether a diff changed nothing. */
export const isEmpty = (changes: GraphChanges): boolean =>
  changes.addLinks.length === 0 &&
  changes.addNodes.length === 0 &&
  changes.changeNodes.length === 0 &&
  changes.removeLinks.length === 0 &&
  changes.removeNodes.length === 0

/**
 * What changed from one drawing to the next, matched by `id` and by a link's
 * two ends.
 *
 * **Linear in the size of the graph and nothing more**, so a page can hand the
 * frame a new array for every message on a busy feed and the renderer is told
 * only what moved: ten thousand notes with one added is one note drawn.
 */
export const diffGraph = (
  before: { links: ReadonlyMap<string, DrawnLink>; nodes: ReadonlyMap<string, DrawnNode> },
  after: { links: ReadonlyMap<string, DrawnLink>; nodes: ReadonlyMap<string, DrawnNode> },
): GraphChanges => {
  const changes: GraphChanges = {
    addLinks: [],
    addNodes: [],
    changeNodes: [],
    removeLinks: [],
    removeNodes: [],
  }
  for (const [id, node] of after.nodes) {
    const was = before.nodes.get(id)
    if (!was) {
      changes.addNodes.push(node)
    } else if (
      was.label !== node.label ||
      was.size !== node.size ||
      was.x !== node.x ||
      was.y !== node.y ||
      was.z !== node.z
    ) {
      changes.changeNodes.push(node)
    }
  }
  for (const id of before.nodes.keys()) {
    if (!after.nodes.has(id)) {
      changes.removeNodes.push(id)
    }
  }
  for (const [key, link] of after.links) {
    const was = before.links.get(key)
    if (!was) {
      changes.addLinks.push(link)
    } else if (was.label !== link.label) {
      /* A link's name is drawn with the link, so a new name is the link again. */
      changes.removeLinks.push(was)
      changes.addLinks.push(link)
    }
  }
  for (const [key, link] of before.links) {
    if (!after.links.has(key)) {
      changes.removeLinks.push(link)
    }
  }
  return changes
}
