/**
 * An example trace, drawn on the Cortex page: four answers a support
 * assistant gave, and everything each was derived from.
 *
 * **Built by Trace and Engram themselves.** `trace-example.json` is written by
 * `cortex/trace/tests/site_example.rs`, which makes each node with Trace's
 * `Graph`, each fact with Engram's `Memory`, and the deletion with
 * `delete_cascade`, and fails when this file falls behind them. Each link runs
 * from a node to what was derived from it, the way `derived_from` reads
 * backward. This module only places what it is given.
 */
import example from './trace-example.json'

/** What the example holds, as the Rust writes it. */
interface Example {
  deleted: string
  links: readonly TraceLink[]
  nodes: readonly {
    id: string
    kind: keyof typeof KINDS
    label: string
    superseded?: boolean
  }[]
  removed: readonly string[]
}

/** The kinds the example's nodes are, Trace's `NodeKind` and Engram's facts, and how each is drawn. */
const KINDS = {
  context: { group: 'Contexts', shape: 'diamond' },
  fact: { group: 'Facts, in Engram', shape: 'circle' },
  memory: { group: 'Memories', shape: 'ring' },
  output: { group: 'Outputs', shape: 'circle' },
  source: { group: 'Sources', shape: 'square' },
  tool_call: { group: 'Tool calls', shape: 'diamond' },
} as const

/**
 * **The order of the columns**, which is the order a trace reads in: what
 * came in, what was kept, what was retrieved, what was looked up, the
 * context assembled, and the answer. A list, since an object's keys are
 * kept sorted.
 */
const ORDER: readonly (keyof typeof KINDS)[] = [
  'source',
  'fact',
  'memory',
  'tool_call',
  'context',
  'output',
]

/** One node of the trace, as the frame takes it, placed. */
export interface TraceNode {
  emphasis?: 'outlined'
  group: string
  id: string
  label: string
  shape: 'circle' | 'diamond' | 'ring' | 'square'
  tone?: 'neutral' | 'primary'
  x: number
  y: number
}

/** One link: `source` is what `target` was derived from. */
export interface TraceLink {
  source: string
  target: string
}

const EXAMPLE = example as Example

/**
 * Each kind's notes, in the order the example made them, which the Rust sets
 * so each column reads in the order of the answers its notes lead to, and
 * the links run across and seldom cross.
 */
const COLUMNS: readonly (readonly string[])[] = ORDER.map((kind) =>
  EXAMPLE.nodes.filter((node) => node.kind === kind).map((node) => node.id),
)

/** How far apart the columns are, and the notes in a column, in the graph's units. */
const ACROSS = 10
const DOWN = 2.6
/** How much further the columns after the sources start, for the sources' longer names. */
const SOURCE_NAMES = 3

/** How the trace is laid out: in columns, across a wide screen, or in rows, down a narrow one. */
export type TraceLayout = 'columns' | 'rows'

/**
 * **Each note's place, in columns or in rows.**
 *
 * - `columns` sets each kind side by side, its notes down the column.
 * - `rows` stacks the kinds down the screen, one note to a line, so a phone
 *   names every note without two names sharing a line. Each kind steps a
 *   little to the right of the one before, so the trace still reads from
 *   what came in to the answer, and a line between kinds parts them.
 *
 * Either way room is left open at each kind's middle, where its group's
 * name is drawn.
 */
const placesFor = (layout: TraceLayout): Map<string, { x: number; y: number }> => {
  const at = new Map<string, { x: number; y: number }>()
  let line = 0
  COLUMNS.forEach((column, across) => {
    if (layout === 'columns') {
      const half = column.length / 2
      column.forEach((id, down) => {
        /* Up is positive in the drawing, so the first in a column is at the
           top; the lower half steps down one more, past the open middle row. */
        const row = down < half ? down : down + 1
        /* **The tool calls sit half a row off**, between the rows the
           retrievals and contexts share: on a row, the link from a
           retrieval to its context ran straight through a tool call it has
           nothing to do with. */
        const off = ORDER[across] === 'tool_call' ? DOWN / 2 : 0
        /* The sources' names are the longest, so the columns after them
           start a little further over. */
        const x = across * ACROSS + (across > 0 ? SOURCE_NAMES : 0)
        at.set(id, { x, y: (column.length / 2 - row) * DOWN + off })
      })
      return
    }
    /* **The group's name is drawn at the middle of its notes**, so the open
       space is where that middle falls. With an even count it is one line,
       halfway between the two halves. With an odd count the upper half is
       one longer, which pulls the middle up off the line between them, so
       the space is three lines, and the middle lands clear of every name. */
    const upper = Math.ceil(column.length / 2)
    const open = column.length % 2 === 0 ? 1 : 3
    column.forEach((id, down) => {
      const row = down < upper ? down : down + open
      at.set(id, { x: across * 0.6, y: -(line + row) })
    })
    /* Past this kind's notes and its open middle, and one more line between kinds. */
    line += column.length + open + 1
  })
  return at
}

/** Every note as the frame takes it, before it is placed. */
const NOTES: readonly Omit<TraceNode, 'x' | 'y'>[] = EXAMPLE.nodes.map((node) => ({
  id: node.id,
  ...KINDS[node.kind],
  /* **Superseded and kept**: Engram retains a fact that was replaced, since
     an answer given while it was current is explained by it. */
  ...(node.superseded
    ? { emphasis: 'outlined', label: `${node.label} (superseded)`, tone: 'neutral' }
    : { label: node.label }),
  ...(node.kind === 'output' ? { tone: 'primary' } : {}),
}))

/** The trace's notes placed for a layout. */
export const traceIn = (layout: TraceLayout): TraceNode[] => {
  const at = placesFor(layout)
  return NOTES.map((one) => ({ ...one, ...(at.get(one.id) ?? { x: 0, y: 0 }) }))
}

export const TRACE_NODES: readonly TraceNode[] = traceIn('columns')

export const TRACE_LINKS: readonly TraceLink[] = EXAMPLE.links

/** The memory the page's button deletes. */
export const TRACE_DELETED = EXAMPLE.deleted

/** What deleting it removes, as Trace's `delete_cascade` answered: the memory and everything derived from it. */
export const TRACE_REMOVED: ReadonlySet<string> = new Set(EXAMPLE.removed)

/** How far past the last column the box reaches, in the graph's units, for the answers' names. */
const NAMES = 0.8 * ACROSS

/**
 * **The box the drawing is fitted to, with room for the answers' names.**
 * Sigma fits the notes to the frame, and a name is drawn to the right of its
 * note, so in columns the last column's names ran past the frame's edge. In
 * rows the notes take a narrow strip in the middle, which leaves names room
 * either side, and the notes' own box is the right one, which `null` asks for.
 */
export const boxFor = (
  layout: TraceLayout,
): { x: [number, number]; y: [number, number] } | null => {
  if (layout === 'rows') {
    return null
  }
  const places = [...placesFor(layout).values()]
  const xs = places.map((place) => place.x)
  const ys = places.map((place) => place.y)
  return {
    x: [Math.min(...xs), Math.max(...xs) + NAMES],
    y: [Math.min(...ys), Math.max(...ys)],
  }
}

/**
 * Everything a note was derived from, as Trace's `why()` walks it: up the
 * links from the note, each note once. The note itself is not among them.
 */
export const derivedFrom = (id: string, links: readonly TraceLink[]): Set<string> => {
  const reached = new Set<string>()
  const queue = [id]
  for (let next = queue.shift(); next !== undefined; next = queue.shift()) {
    for (const link of links) {
      if (link.target === next && !reached.has(link.source)) {
        reached.add(link.source)
        queue.push(link.source)
      }
    }
  }
  reached.delete(id)
  return reached
}

/** The groups in the order an answer is explained in: nearest first, back to what came in. */
export const WHY_ORDER: readonly string[] = [
  'Contexts',
  'Tool calls',
  'Memories',
  'Facts, in Engram',
  'Sources',
]
