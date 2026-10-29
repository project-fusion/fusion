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

/** The words one name a `labelledby` lists gives a node: its own `label`, or a region's words. */
const labelWords = (values: Styling, node: Node, name: string, own: unknown): string => {
  if (name === node.name) {
    return typeof own === 'string' ? own : ''
  }
  const named = regionIn(values.family.tree, name)
  const words =
    named === undefined ? wordsOf(given(values, name)) : wordsOfNode(values, named).join(' ')
  return typeof words === 'string' ? words : ''
}

/**
 * A node's label, where it has words: its `label`, or **the words of the
 * regions its `labelledby` names**, as a section is named by its summary,
 * where the web points `aria-labelledby` at the region: what is passed into
 * each, or the words it falls back to, as a timeline group's heading falls
 * back to its `label`, and its own `label` where the regions hold none, as
 * an outline is named "On this page" without a heading.
 *
 * **A `labelledby` that lists the node's own name reads its `label` there**,
 * as the web's `aria-labelledby` lists the element's own id: a number
 * input's stepper is "Decrease Guests", its `label` and then the field's.
 */
export const labelOf = (values: Styling, node: Node): string | undefined => {
  const regions = node.attributes?.labelledby
  const own = bound(values, node.attributes?.label, node.name)
  const label =
    typeof regions !== 'string'
      ? own
      : regions
          .split(/\s+/)
          .filter((name) => name !== '')
          .map((name) => labelWords(values, node, name, own))
          .filter((words) => words !== '')
          .join(' ')
  if (typeof label === 'string' && label !== '') {
    return label
  }
  /* Regions that hold no words leave the part its own `label`, as an
     empty `aria-labelledby` leaves the web's `aria-label`. */
  return typeof regions === 'string' && typeof own === 'string' && own !== '' ? own : undefined
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
