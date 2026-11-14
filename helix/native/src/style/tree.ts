/** Where a part sits in a family's part tree, and what it holds. */
import type { Node } from './form.js'
import type { Resolution } from './resolved.js'

/**
 * `> slot` reaches the content a part holds, which is a region's on every
 * platform. Any other written-out selector stays the web's.
 */
export const REGIONS = '> slot'

/**
 * The parts from the host down to `part`, outermost first, and `part` alone
 * where the tree does not have it.
 *
 * **A wrapper is not a level of its own.** A row's link wraps its content on
 * the web only, so a native view lays that content out in the row. **A layer
 * is**, as the box it opens: what it holds inherits the private values its
 * rules set, as a popover's point draws the edge its panel sets.
 */
export const lineage = (tree: readonly Node[], part: string): string[] => {
  if (part === 'host') {
    return []
  }
  const find = (nodes: readonly Node[], path: string[]): string[] | undefined => {
    for (const node of nodes) {
      const named =
        node.kind === 'box' ||
        node.kind === 'layer' ||
        node.kind === 'live' ||
        node.kind === 'pressable'
      const here = named ? [...path, node.name] : path
      if (named && node.name === part) {
        return here
      }
      const found = find(node.children ?? [], here)
      if (found !== undefined) {
        return found
      }
    }
    return undefined
  }
  return find(tree, []) ?? [part]
}

/**
 * The parts a node holds directly, through any `when` or wrapper, in order,
 * with a region that is a part counted as the box it is.
 */
export const held = (nodes: readonly Node[]): string[] =>
  nodes.flatMap((node) =>
    node.kind === 'when' || node.kind === 'wrap'
      ? held(node.children ?? [])
      : node.kind === 'box' || node.kind === 'pressable' || node.kind === 'live'
        ? [node.name]
        : node.kind === 'region' && typeof node.attributes?.part === 'string'
          ? [node.attributes.part]
          : [],
  )

/** The node named `part`, anywhere in a tree. */
export const named = (nodes: readonly Node[], part: string): Node | undefined => {
  for (const node of nodes) {
    if (
      node.name === part &&
      node.kind !== 'region' &&
      node.kind !== 'when' &&
      node.kind !== 'wrap'
    ) {
      return node
    }
    const found = named(node.children ?? [], part)
    if (found !== undefined) {
      return found
    }
  }
  return undefined
}

/** `auto minmax(0, 1fr)` as its two tracks. */
export const tracks = (template: Resolution): string[] =>
  typeof template === 'string' ? (template.match(/[\w.-]+\([^)]*\)|[^\s()]+/g) ?? []) : []

/**
 * Whether a grid's columns are one track, which lays its items in a column,
 * as `minmax(0, 1fr)` and `subgrid` across one track do. A `repeat()` is as
 * many tracks as it says.
 */
export const oneColumn = (template: Resolution): boolean => {
  const each = tracks(template)
  return each.length === 1 && !/^repeat\(/.test(each[0] ?? '')
}
