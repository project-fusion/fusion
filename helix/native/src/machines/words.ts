import { Fragment, isValidElement, type ReactElement } from 'react'

/** The children an element holds, as its props carry them. */
const childrenOf = (element: ReactElement): unknown =>
  (element.props as { readonly children?: unknown }).children

/**
 * The content as a flat list, without what draws nothing. A fragment stands
 * for what it holds, as React DOM draws its children in its place.
 */
const flat = (content: unknown): unknown[] =>
  Array.isArray(content)
    ? content.flatMap(flat)
    : isValidElement(content) && content.type === Fragment
      ? flat(childrenOf(content))
      : content === undefined || content === null || typeof content === 'boolean'
        ? []
        : [content]

/** The text of one child and of everything it holds, in order, as `textContent` reads a node. */
export const textOf = (child: unknown): string =>
  typeof child === 'string' || typeof child === 'number'
    ? String(child)
    : Array.isArray(child)
      ? child.map(textOf).join('')
      : isValidElement(child)
        ? flat(childrenOf(child)).map(textOf).join('')
        : ''

/**
 * The words among some content, as an item's name, or `''` where it has
 * none: the text of each child, nested elements included, in order. Each
 * child's text has its runs of white space made one, and the children are
 * joined by a space, as the web's `slottedWords` reads the default slot.
 *
 * **Only `children` is read.** A component that draws words from another
 * prop, or a nested element's named region, has words this cannot see until
 * it draws.
 */
export const wordsOf = (content: unknown): string =>
  flat(content)
    .map((child) => textOf(child).replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join(' ')
