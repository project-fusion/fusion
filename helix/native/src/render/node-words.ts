/**
 * The words a screen reader hears in a node, and the label a node takes
 * from its own `label` or from the region its `labelledby` names.
 */
import { wordsOf } from '../machines/words'
import type { Node } from '../style/form'
import { holds } from './announced'
import { drawsOwn } from './passed'
import { bound, camel, given, type Styling } from './styles'

/** Whether a `when` draws what it holds: while its prop or state holds, or does not, for an `unless()`. */
export const drawsWhen = (styling: Styling, node: Node): boolean =>
  Boolean(styling.base.conditions[node.name]) !== (node.attributes?.unless === true)

/**
 * The words a screen reader hears inside some nodes, in order: what each
 * region is passed, or what it falls back to, and each text's words. A
 * decorative or hidden node, and a `when` that draws nothing, has none.
 */
export const wordsInside = (styling: Styling, nodes: readonly Node[]): string[] =>
  nodes.flatMap((child) => wordsOfNode(styling, child))

/** The words a screen reader hears in one node, as `wordsInside` reads them. */
export const wordsOfNode = (styling: Styling, node: Node): string[] => {
  if (holds(styling, node, 'decorative') || holds(styling, node, 'hidden')) {
    return []
  }
  switch (node.kind) {
    case 'when':
      return drawsWhen(styling, node) ? wordsInside(styling, node.children ?? []) : []
    case 'text':
      return saidWords(styling, node)
    case 'region': {
      const passed = passedWords(styling, node)
      return passed === '' ? wordsInside(styling, node.children ?? []) : [passed]
    }
    default:
      return wordsInside(styling, node.children ?? [])
  }
}

/** The words a text says, as a list of one, or none. */
const saidWords = (styling: Styling, text: Node): string[] => {
  const words = bound(styling, text.attributes?.says, text.name)
  return typeof words === 'string' && words !== '' ? [words] : []
}

/** The words passed into a region, or `''` where it draws its own. */
const passedWords = (styling: Styling, region: Node): string => {
  const content =
    region.name === 'default' ? styling.props.children : styling.props[camel(region.name)]
  return typeof content === 'string' && drawsOwn(region) ? '' : wordsOf(content)
}

/** The region of `name` in a tree, where it draws one. */
const regionIn = (nodes: readonly Node[] | undefined, name: string): Node | undefined => {
  for (const node of nodes ?? []) {
    if (node.kind === 'region' && node.name === name) {
      return node
    }
    const inner = regionIn(node.children, name)
    if (inner !== undefined) {
      return inner
    }
  }
  return undefined
}

/**
 * A node's label, where it has words: its `label`, or **the words of the
 * region its `labelledby` names**, as a section is named by its summary,
 * where the web points `aria-labelledby` at the region: what is passed into
 * it, or the words it falls back to, as a timeline group's heading falls
 * back to its `label`, and its own `label` where the region holds none, as
 * an outline is named "On this page" without a heading.
 */
export const labelOf = (values: Styling, node: Node): string | undefined => {
  const region = node.attributes?.labelledby
  const named = typeof region === 'string' ? regionIn(values.family.tree, region) : undefined
  const own = bound(values, node.attributes?.label, node.name)
  const label =
    typeof region !== 'string'
      ? own
      : named === undefined
        ? wordsOf(given(values, region))
        : wordsOfNode(values, named).join(' ')
  if (typeof label === 'string' && label !== '') {
    return label
  }
  /* A region that holds no words leaves the part its own `label`, as an
     empty `aria-labelledby` leaves the web's `aria-label`. */
  return typeof region === 'string' && typeof own === 'string' && own !== '' ? own : undefined
}

/**
 * The words that describe a node, where its `describedby` names regions:
 * what is passed into each, as the web's `aria-describedby` reads the
 * slots, each region's words apart.
 */
export const describedOf = (values: Styling, node: Node): string[] => {
  const regions = node.attributes?.describedby
  if (typeof regions !== 'string') {
    return []
  }
  return regions
    .split(/\s+/)
    .filter((name) => name !== '')
    .map((name) => wordsOf(given(values, name)))
    .filter((words): words is string => typeof words === 'string' && words !== '')
}
