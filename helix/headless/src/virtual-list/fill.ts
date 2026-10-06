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

/**
 * The text a value takes in a row.
 *
 * Nothing for a missing value, so a hole whose field is absent is empty and
 * does not read "undefined".
 */
export const textOf = (value: unknown): string =>
  value === undefined || value === null || typeof value === 'object' ? '' : String(value)

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

/** Fills one element's holes, its own and those below it, from an item. */
export const fillHoles = (root: Element, item: unknown): void => {
  const holes = [...(root.matches('[data-field]') ? [root] : []), ...root.querySelectorAll('*')]
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

/**
 * The key of item `at` in a selecting list's `value`: its `keyField` where it
 * is an object and one is named, a string or a number item itself, and its
 * place in the set otherwise.
 */
export const keyOf = (item: unknown, at: number, keyField: string): string => {
  if (keyField !== '' && item !== null && typeof item === 'object') {
    return textOf(valueAt(item, keyField))
  }
  return typeof item === 'string' || typeof item === 'number' ? String(item) : String(at)
}

/**
 * The text typing matches for each item: its `field`, or a string or number
 * item itself, and nothing where an object has no `field` to read.
 */
export const textsOf = (data: readonly unknown[], field: string): string[] =>
  data.map((item) =>
    field === '' || item === null || typeof item !== 'object'
      ? textOf(item)
      : textOf(valueAt(item, field)),
  )
