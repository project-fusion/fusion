import { openLink } from '@fusion.dev/helix-core/capabilities/open-link'
import type { Props } from '../render/behavior'
import type { Family, Node } from '../style/form'
import type { Told } from './press'
import { given } from './props'

/*
 * Where an element's press goes as a link: the link a press that joins no set
 * opens, and whether an item draws its link inside its press, which a press
 * in a set that chooses then only follows.
 */

/** The node of `tree` named `name`, where there is one. */
const nodeNamed = (tree: readonly Node[] | undefined, name: string): Node | undefined => {
  for (const node of tree ?? []) {
    const found = node.name === name ? node : nodeNamed(node.children, name)
    if (found !== undefined) {
      return found
    }
  }
  return undefined
}

/**
 * Whether the part named `part` draws a link inside it, as a tag draws its
 * label and a list's row its words: a wrap with an `href` among what it holds.
 */
export const linksInside = (family: Family, part: string): boolean => {
  const has = (nodes: readonly Node[]): boolean =>
    nodes.some(
      (node) =>
        (node.kind === 'wrap' && node.attributes?.href !== undefined) || has(node.children ?? []),
    )
  return has(nodeNamed(family.tree, part)?.children ?? [])
}

/**
 * **A press that is a link and joins no set opens it once its event stands**,
 * as a crumb does, and its event carries the link as its value, as on the
 * web. A press with nowhere to go tells nothing.
 */
export const linkedBy = (family: Family, props: Props, part: string): Told => {
  const href = nodeNamed(family.tree, part)?.attributes?.href
  const link =
    typeof href === 'object' && href !== null && 'bind' in href
      ? given(family, props, String(href.bind))
      : href
  if (typeof link !== 'string' || link === '') {
    return {}
  }
  return { detail: { value: link }, stood: () => openLink().open(link) }
}
