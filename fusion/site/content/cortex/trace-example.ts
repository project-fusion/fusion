/**
 * An example trace, drawn on the Cortex page: three answers a support
 * assistant gave, and everything each was derived from, in Trace's own
 * terms. Each link runs from a node to what was derived from it, the way
 * `derived_from` reads backward, so deleting a node removes everything
 * downstream of it, as `delete_cascade` does.
 */

/** The kinds a trace's nodes are, as Trace's `NodeKind` names them, and how each is drawn. */
const KINDS = {
  context: { group: 'Contexts', shape: 'diamond' },
  memory: { group: 'Memories', shape: 'circle' },
  output: { group: 'Outputs', shape: 'circle' },
  source: { group: 'Sources', shape: 'square' },
  tool: { group: 'Tool calls', shape: 'ring' },
} as const

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

const node = (
  kind: keyof typeof KINDS,
  id: string,
  label: string,
  more: Partial<TraceNode> = {},
): Omit<TraceNode, 'x' | 'y'> => ({ id, label, ...KINDS[kind], ...more })

/**
 * **In columns, the way a trace reads**: what came in, what was kept, what
 * was looked up, the context assembled from them, and the answer. Each
 * column's notes in the order of the answers they lead to, so the links run
 * across and seldom cross, and **a row left open at each column's middle**,
 * where its group's name is drawn. Placed here, so no layout runs.
 */
const COLUMNS: readonly (readonly string[])[] = [
  [
    'q-release',
    's-release',
    'q-price',
    's-pricing-september',
    's-pricing',
    's-chat',
    'q-refund',
    's-refunds',
  ],
  ['m-shipped', 'm-export', 'm-price-september', 'm-price', 'm-plan', 'm-email', 'm-refunds'],
  ['t-search', 't-account'],
  ['c-release', 'c-price', 'c-refund'],
  ['o-release', 'o-price', 'o-refund'],
]

/** How far apart the columns are, and the notes in a column, in the graph's units. */
const ACROSS = 10
const DOWN = 2.6

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
        at.set(id, { x: across * ACROSS, y: (column.length / 2 - row) * DOWN })
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

const placed = (nodes: readonly Omit<TraceNode, 'x' | 'y'>[]): TraceNode[] => {
  const at = placesFor('columns')
  return nodes.map((one) => ({ ...one, ...(at.get(one.id) ?? { x: 0, y: 0 }) }))
}

/** The trace's notes placed for a layout. */
export const traceIn = (layout: TraceLayout): TraceNode[] => {
  const at = placesFor(layout)
  return TRACE_NODES.map((one) => ({ ...one, ...(at.get(one.id) ?? { x: 0, y: 0 }) }))
}

export const TRACE_NODES: readonly TraceNode[] = placed([
  node('source', 'q-release', 'When did 0.11 ship?'),
  node('source', 'q-price', 'What will my plan cost?'),
  node('source', 'q-refund', 'Can I get a refund?'),
  node('source', 's-release', 'Release notes'),
  node('source', 's-pricing-september', 'September pricing'),
  node('source', 's-pricing', 'October pricing'),
  node('source', 's-chat', 'Support chat'),
  node('source', 's-refunds', 'Refund policy'),
  node('memory', 'm-shipped', 'Shipped October 8'),
  node('memory', 'm-export', 'Fixes the export bug'),
  /* **Superseded and kept**: Trace retains a fact that was replaced, since
     an answer given while it was current is explained by it. */
  node('memory', 'm-price-september', 'Pro was $15 (superseded)', {
    emphasis: 'outlined',
    tone: 'neutral',
  }),
  node('memory', 'm-price', 'Pro is $20 a seat'),
  node('memory', 'm-plan', 'On the Pro plan'),
  node('memory', 'm-email', 'Prefers email'),
  node('memory', 'm-refunds', 'Refunds in 30 days'),
  node('tool', 't-search', 'search_docs'),
  node('tool', 't-account', 'lookup_account'),
  node('context', 'c-release', 'Release context'),
  node('context', 'c-price', 'Pricing context'),
  node('context', 'c-refund', 'Refund context'),
  node('output', 'o-release', '“Shipped on the 8th.”', { tone: 'primary' }),
  node('output', 'o-price', '“Pro is $20 a seat.”', { tone: 'primary' }),
  node('output', 'o-refund', '“Within 30 days.”', { tone: 'primary' }),
])

const from = (source: string, ...targets: string[]): TraceLink[] =>
  targets.map((target) => ({ source, target }))

export const TRACE_LINKS: readonly TraceLink[] = [
  ...from('s-release', 'm-shipped', 'm-export'),
  ...from('s-pricing-september', 'm-price-september'),
  ...from('s-pricing', 'm-price'),
  ...from('s-chat', 'm-plan', 'm-email'),
  ...from('s-refunds', 'm-refunds'),
  ...from('q-price', 't-search', 't-account'),
  ...from('t-search', 'c-price'),
  ...from('t-account', 'c-price'),
  ...from('q-release', 'c-release'),
  ...from('m-shipped', 'c-release'),
  ...from('m-export', 'c-release'),
  ...from('q-price', 'c-price'),
  ...from('m-price', 'c-price'),
  ...from('m-plan', 'c-price'),
  ...from('q-refund', 'c-refund'),
  ...from('m-refunds', 'c-refund'),
  ...from('m-email', 'c-refund'),
  ...from('c-release', 'o-release'),
  ...from('c-price', 'o-price'),
  ...from('c-refund', 'o-refund'),
]

/** The memory the page's button deletes, with everything derived from it. */
export const TRACE_DELETED = 'm-price'

/**
 * A node and everything derived from it, as `delete_cascade` removes them:
 * the node, what was derived from it, and on down. What it was derived from
 * is untouched.
 */
export const cascadeOf = (id: string, links: readonly TraceLink[]): Set<string> => {
  const removed = new Set<string>()
  const queue = [id]
  for (let next = queue.pop(); next !== undefined; next = queue.pop()) {
    if (removed.has(next)) {
      continue
    }
    removed.add(next)
    for (const link of links) {
      if (link.source === next) {
        queue.push(link.target)
      }
    }
  }
  return removed
}
