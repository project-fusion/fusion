import type { Node } from '../style/form'

/** The nodes drawn beside each other as elements, through any `when` or `wrap`. */
const beside = (nodes: readonly Node[]): Node[] =>
  nodes.flatMap((node) =>
    node.kind === 'when' || node.kind === 'wrap'
      ? beside(node.children ?? [])
      : node.kind === 'text'
        ? []
        : [node],
  )

/**
 * Where a node stands among the nodes the tree draws beside it, which a rule
 * on its part reads as `:first-child` or `:last-child`, as a divider's two
 * halves are the first and the last.
 */
export const placeIn = (
  nodes: readonly Node[],
  node: Node,
):
  | {
      readonly child: 'first' | 'later'
      readonly fromEnd: number
      readonly index: number
      readonly last: boolean
    }
  | undefined => {
  const drawn = beside(nodes)
  const at = drawn.indexOf(node)
  if (at >= 0) {
    return {
      child: at === 0 ? 'first' : 'later',
      fromEnd: drawn.length - at,
      index: at + 1,
      last: at === drawn.length - 1,
    }
  }
  for (const one of nodes) {
    const found = placeIn(one.children ?? [], node)
    if (found !== undefined) {
      return found
    }
  }
  return undefined
}
