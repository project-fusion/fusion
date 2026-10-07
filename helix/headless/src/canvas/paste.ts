/**
 * What a paste adds to a board: the arithmetic, kept apart from the board that
 * adds it.
 */
import type { CanvasDocument, CanvasEdge, CanvasNode } from './root/canvas-document.js'

/** Whether a value is a finite number. */
const finite = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

/**
 * A JSON Canvas document read from pasted text, or nothing where the text is
 * not one: any text that does not parse, or a node without an id, a type and
 * a box. An edge whose ends are not both among the nodes is left out.
 */
export const parseCanvas = (text: string): CanvasDocument | undefined => {
  let read: unknown
  try {
    read = JSON.parse(text)
  } catch {
    return undefined
  }
  const { edges, nodes } = (read ?? {}) as { edges?: unknown; nodes?: unknown }
  if (!Array.isArray(nodes) || nodes.length === 0) {
    return undefined
  }
  const valid = nodes.every(
    (node: Partial<CanvasNode>) =>
      typeof node?.id === 'string' &&
      typeof node.type === 'string' &&
      [node.x, node.y, node.width, node.height].every(finite),
  )
  if (!valid) {
    return undefined
  }
  const ids = new Set((nodes as CanvasNode[]).map((node) => node.id))
  return {
    edges: (Array.isArray(edges) ? (edges as CanvasEdge[]) : []).filter(
      (edge) => ids.has(edge?.fromNode) && ids.has(edge?.toNode),
    ),
    nodes: nodes as CanvasNode[],
  }
}

/**
 * The document a paste adds to a board that already holds `nodes` and the
 * connections named in `taken`.
 *
 * **Every id is made new where the board has it**, by a count after it, and
 * the connections follow their cards to the new ids. **The cards move clear
 * of what they were copied from**: a step down and to the right, and another
 * while any pasted card would still sit where a card already is, so a second
 * paste lands beside the first. Cards from another board, where nothing sits,
 * stay where they were.
 *
 * @param step How far each move is, in the document's own units.
 */
export const pasteInto = (
  document: CanvasDocument,
  nodes: readonly CanvasNode[],
  taken: ReadonlySet<string>,
  step: number,
): CanvasDocument => {
  const used = new Set([...taken, ...nodes.map((node) => node.id)])
  const unique = (id: string): string => {
    let next = id
    for (let count = 2; used.has(next); count++) {
      next = `${id}-${count}`
    }
    used.add(next)
    return next
  }
  const corners = new Set(nodes.map((node) => `${Math.round(node.x)},${Math.round(node.y)}`))
  const pasted = document.nodes ?? []
  let by = 0
  while (
    step > 0 &&
    pasted.some((node) => corners.has(`${Math.round(node.x + by)},${Math.round(node.y + by)}`))
  ) {
    by += step
  }
  const renamed = new Map<string, string>()
  const out: CanvasNode[] = pasted.map((node) => {
    const id = unique(node.id)
    renamed.set(node.id, id)
    return { ...node, id, x: node.x + by, y: node.y + by }
  })
  return {
    edges: (document.edges ?? []).map((edge) => ({
      ...edge,
      fromNode: renamed.get(edge.fromNode) ?? edge.fromNode,
      id: unique(edge.id || `${edge.fromNode}-${edge.toNode}`),
      toNode: renamed.get(edge.toNode) ?? edge.toNode,
    })),
    nodes: out,
  }
}
