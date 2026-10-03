/** The shapes a note can be drawn in, from the `shape` axis. */
export type GraphNodeShape = 'circle' | 'diamond' | 'ring' | 'square'

/** How heavily a note is drawn, from the `emphasis` axis. */
export type GraphNodeEmphasis = 'outlined' | 'solid' | 'subtle'

/** What a note is drawn as made of, from the `material` axis. */
export type GraphNodeMaterial = 'frosted' | 'glass'

/** What a note means, from the `tone` axis, which colors it over its group. */
export type GraphNodeTone =
  | 'accent'
  | 'danger'
  | 'info'
  | 'neutral'
  | 'primary'
  | 'success'
  | 'warning'

/** One note in a graph. */
export interface GraphNode {
  /** Unique in the graph, and what `active` and a link's ends name. */
  id: string
  /** What the note is called. Its `id` where it has none. */
  label?: string | undefined
  /**
   * How heavily it is drawn: `solid`, filled, which unset is; `outlined`, a
   * ring with the ground showing through; `subtle`, a tinted fill with a
   * ring. Unset is the renderer's own.
   */
  emphasis?: GraphNodeEmphasis | undefined
  /** A kind the note belongs to, such as a tag, which a renderer colors it by. */
  group?: string | undefined
  /** What it is drawn as made of: `glass` or `frosted`. Unset is the renderer's own. */
  material?: GraphNodeMaterial | undefined
  /**
   * Its shape, which says what kind of note it is at a glance: a person as a
   * circle and a document as a square. Unset is the renderer's own.
   */
  shape?: GraphNodeShape | undefined
  /**
   * What it means, which colors it over its group's color: `danger` for an
   * incident, `success` for something done.
   */
  tone?: GraphNodeTone | undefined
  /** How large the renderer draws it, relative to the others. */
  size?: number | undefined
  /** Where the note stands, where the page already knows. Laid out where it does not. */
  x?: number | undefined
  /** Where the note stands, where the page already knows. Laid out where it does not. */
  y?: number | undefined
  /** How near the viewer the note stands, for a renderer that draws in three dimensions. */
  z?: number | undefined
}

/** One link between two notes, from `source` to `target`. */
export interface GraphLink {
  source: string
  target: string
  /** What the link says, such as "cites". */
  label?: string | undefined
}

/** Which notes each note links to and is linked from. */
export type Adjacency = Map<string, { from: Set<string>; to: Set<string> }>

/** How a note in the list stands to the selected one. */
export type Relation = 'both' | 'from' | 'selected' | 'to'

/** One row of the list: a note, and how it stands to the selected one where it does. */
export interface Entry {
  node: GraphNode
  relation?: Relation | undefined
}

/** A note's name, its `id` where it has no label. */
export const nameOf = (node: GraphNode): string => node.label || node.id

/**
 * Which notes each note links to and is linked from, in one pass over the
 * links. A link naming a note that is not in the graph is kept: the list
 * shows notes and not links, so it does no harm, and a page adding the note a
 * moment later finds its links already counted.
 */
export const adjacencyOf = (links: readonly GraphLink[]): Adjacency => {
  const adjacency: Adjacency = new Map()
  const at = (id: string) => {
    let found = adjacency.get(id)
    if (!found) {
      found = { from: new Set(), to: new Set() }
      adjacency.set(id, found)
    }
    return found
  }
  for (const { source, target } of links) {
    if (source === target) {
      continue
    }
    at(source).to.add(target)
    at(target).from.add(source)
  }
  return adjacency
}

/**
 * The notes within `depth` links of `from`, whichever way each link runs, the
 * note itself included: the local graph.
 *
 * **Both ways, as a reader thinks of a note's neighborhood**: a note that
 * cites this one is as near to it as one this one cites.
 */
export const within = (adjacency: Adjacency, from: string, depth: number): Set<string> => {
  const reached = new Set([from])
  let edge = [from]
  for (let step = 0; step < depth && edge.length > 0; step++) {
    const next: string[] = []
    for (const id of edge) {
      const near = adjacency.get(id)
      for (const one of [...(near?.to ?? []), ...(near?.from ?? [])]) {
        if (!reached.has(one)) {
          reached.add(one)
          next.push(one)
        }
      }
    }
    edge = next
  }
  return reached
}

/**
 * The list's rows, in the order a reader wants them: the selected note, then
 * the notes it links to and from, then every other note, each part in the
 * order of its names, and only the notes `shown` holds and `query` matches.
 *
 * **The neighborhood first**, because it is what a reader came to the graph
 * for and what a picture of it shows by its lines, which a list has to say in
 * its order instead.
 */
export const entriesOf = (
  sorted: readonly GraphNode[],
  adjacency: Adjacency,
  active: string,
  query: string,
  shown?: ReadonlySet<string>,
): Entry[] => {
  const wanted = query.trim().toLocaleLowerCase()
  const kept = (node: GraphNode): boolean =>
    (!shown || shown.has(node.id)) &&
    (wanted === '' || nameOf(node).toLocaleLowerCase().includes(wanted))
  const near = adjacency.get(active)
  const relationOf = (id: string): Relation | undefined => {
    if (id === active) {
      return 'selected'
    }
    const to = near?.to.has(id) === true
    const from = near?.from.has(id) === true
    return to && from ? 'both' : to ? 'to' : from ? 'from' : undefined
  }
  const first: Entry[] = []
  const neighbors: Entry[] = []
  const rest: Entry[] = []
  for (const node of sorted) {
    if (!kept(node)) {
      continue
    }
    const relation = relationOf(node.id)
    if (relation === 'selected') {
      first.push({ node, relation })
    } else if (relation) {
      neighbors.push({ node, relation })
    } else {
      rest.push({ node })
    }
  }
  return [...first, ...neighbors, ...rest]
}

/** The notes in the order of their names, as the page's language orders words. */
export const sortedOf = (nodes: readonly GraphNode[], lang?: string): GraphNode[] => {
  const collator = new Intl.Collator(lang || undefined, { numeric: true, sensitivity: 'base' })
  return [...nodes].sort((one, other) => collator.compare(nameOf(one), nameOf(other)))
}

/** One group the notes are in, as the legend names it. */
export interface GraphGroupEntry {
  /** The group's name, as the notes give it. */
  name: string
  /** The tone every note in the group has, where they all have the same one, which colors them over the group's color. */
  tone?: GraphNodeTone | undefined
}

/**
 * The groups the notes are in, each once, **in the order `sort()` gives
 * their names**, which is the order `connectGraph` hands out the series
 * colors in: the legend's first group is the drawing's first color.
 *
 * A group takes a tone where every one of its notes has the same one, since
 * the drawing colors a toned note by its tone and the group's name in the
 * color of a note without one.
 */
export const groupsOf = (nodes: readonly GraphNode[]): GraphGroupEntry[] => {
  const tones = new Map<string, GraphNodeTone | null | undefined>()
  for (const node of nodes) {
    if (node.group === undefined || node.group === '') {
      continue
    }
    const tone = node.tone ?? null
    if (!tones.has(node.group)) {
      tones.set(node.group, tone)
    } else if (tones.get(node.group) !== tone) {
      tones.set(node.group, null)
    }
  }
  return [...tones.keys()].sort().map((name) => ({ name, tone: tones.get(name) ?? undefined }))
}

/**
 * The notes kept by the local graph, `local`, where there is one, less every
 * note in a hidden group, or `undefined` where nothing is left out. A note in
 * no group is never hidden: the legend names only groups.
 */
export const withoutGroups = (
  nodes: readonly GraphNode[],
  local: Set<string> | undefined,
  hidden: readonly string[],
): Set<string> | undefined => {
  if (hidden.length === 0) {
    return local
  }
  const off = new Set(hidden)
  const kept = new Set<string>()
  for (const node of nodes) {
    if ((local === undefined || local.has(node.id)) && !off.has(node.group ?? '')) {
      kept.add(node.id)
    }
  }
  return kept
}
