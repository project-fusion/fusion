import type { MachineUse } from '../ir.generated'
import type { Family, Node } from '../style/form'
import { boundTo } from './props'

/** The path from the top of `tree` to the node named `name`, or `undefined` where none is. */
const pathTo = (tree: readonly Node[] | undefined, name: string): readonly Node[] | undefined => {
  for (const node of tree ?? []) {
    if (node.name === name) {
      return [node]
    }
    const inner = pathTo(node.children, name)
    if (inner !== undefined) {
      return [node, ...inner]
    }
  }
  return undefined
}

/**
 * Where a press on `part` scrolls: the edge its `scrolls` attribute names, and
 * the box around it that scrolls, or `undefined` for a press that scrolls
 * nothing.
 */
export const scrollingOf = (
  family: Family,
  part: string,
): { readonly scroller: string; readonly toward: 'end' | 'start' } | undefined => {
  const path = pathTo(family.tree, part) ?? []
  const toward = path.at(-1)?.attributes?.scrolls
  const scroller = path.findLast((node, at) => at < path.length - 1 && node.kind === 'box')
  return (toward === 'end' || toward === 'start') && scroller !== undefined
    ? { scroller: scroller.name, toward }
    : undefined
}

/** The boxes a family's scroll buttons page, which hand their pagers to the element. */
export const scrollersOf = (family: Family, uses: readonly MachineUse[]): readonly string[] => [
  ...new Set(
    uses.flatMap((use) => {
      const scrolling = scrollingOf(family, boundTo(use, 'part', 'part') ?? '')
      return scrolling === undefined ? [] : [scrolling.scroller]
    }),
  ),
]
