/**
 * Filling a row from an item, for a list whose rows come from a `<template>`.
 *
 * A row template marks its holes with data attributes, so it stays markup a
 * server can send and a framework can write as a string:
 *
 * - `data-field="name"` takes the item's `name` as its text.
 * - `data-field-href="url"` takes the item's `url` as its `href`, and the same
 *   for any attribute: `data-field-aria-label`, `data-field-src`,
 *   `data-field-title`.
 *
 * A field is a key, or a path of keys joined by dots (`author.name`).
 */

import { valueAt } from '@fusion.dev/helix-core'
import { keyOf, textOf, textsOf } from '@fusion.dev/helix-core/virtual-list'

export { keyOf, textOf, textsOf }

/** The prefix a data attribute takes to name an attribute it fills. */
const ATTRIBUTE = 'data-field-'

/**
 * Writes one attribute from a value.
 *
 * `true` writes the attribute empty, the way a boolean attribute is written,
 * and `false`, `null` or a missing value takes it off.
 */
const writeAttribute = (element: Element, name: string, value: unknown): void => {
  if (value === undefined || value === null || value === false) {
    element.removeAttribute(name)
    return
  }
  element.setAttribute(name, value === true ? '' : textOf(value))
}

/**
 * Fills one element's holes, its own and those below it, from an item.
 *
 * The element itself whatever hole it carries, so a row whose root is a link
 * takes its `data-field-href` as readily as its text.
 */
export const fillHoles = (root: Element, item: unknown): void => {
  const holes = [root, ...root.querySelectorAll('*')]
  for (const hole of holes) {
    for (const { name, value } of [...hole.attributes]) {
      if (name === 'data-field') {
        hole.textContent = textOf(valueAt(item, value))
      } else if (name.startsWith(ATTRIBUTE)) {
        writeAttribute(hole, name.slice(ATTRIBUTE.length), valueAt(item, value))
      }
    }
  }
}
