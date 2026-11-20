import type { Node } from '../style/form'
import type { Slotted, Style } from '../style/resolved'
import { inherit, type Scope, split } from './styles'

/** The part a region is drawn inside, which its rules' `within` reads, or none in the host. */
export const insideOf = (inside: Node | 'host'): { readonly inside?: readonly string[] } =>
  inside === 'host' ? {} : { inside: [inside.name] }

/**
 * **What the region gives a child sets its words too**, as a `::slotted()`
 * rule's color and font reach the text inside the element it styles: a child
 * that is no element of Helix's reads them from here.
 */
export const wordsOf = (
  styled: Readonly<Record<string, Slotted>>,
  child: unknown,
  inherits: Style,
): Style => {
  const tag = (child as { type?: { tag?: unknown } }).type?.tag
  const own = (typeof tag === 'string' ? styled[tag] : undefined) ?? styled['*']
  return own === undefined ? inherits : inherit(inherits, split(own.style)[1])
}

/**
 * Whether a region's fallback draws the words of the prop the region is
 * named for, as an empty view's `heading` region falls back to a heading of
 * the `heading` words. **Words given to that prop are the fallback's**, as
 * the web element's property draws them inside its slot, and only an element
 * passed in replaces them. **Words given to a region that `names` the
 * element are its name**, as a meter's `label`, and it draws its fallback.
 */
export const drawsOwn = (node: Node): boolean => {
  if (node.attributes?.names === true) {
    return true
  }
  const reads = (nodes: readonly Node[]): boolean =>
    nodes.some(
      (child) =>
        (child.kind === 'when' && child.name === node.name) ||
        (typeof child.attributes?.says === 'object' &&
          child.attributes.says !== null &&
          'bind' in child.attributes.says &&
          child.attributes.says.bind === node.name) ||
        reads(child.children ?? []),
    )
  return reads(node.children ?? [])
}

/**
 * **Words passed into a named region are an element on the web**, as
 * `<span slot="label">` is, so they take the text style the region's rules
 * give each child, as a stat's label does. Words in the default region are a
 * text node there, which no `::slotted()` rule reaches.
 */
export const eachChild = (scope: Scope, node: Node): Style =>
  node.name === 'default'
    ? {}
    : split(scope.host.contents[node.name]?.children?.['*']?.style ?? {})[1]
