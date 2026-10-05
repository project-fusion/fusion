import { elementById } from '@fusion.dev/helix-core'

/** What a `from` reference names: an element by its id, and what to read from it. */
export interface FromReference {
  /** An attribute to read, written `id[attribute]`. */
  readonly attribute?: string
  /** The id of the element. */
  readonly id: string
  /** A property to read, written `id.property`. */
  readonly property?: string
}

/**
 * Reads a `from` reference: `id` for the element's text, `id[attribute]` for
 * an attribute, and `id.property` for a property. Web Awesome's Copy Button
 * takes the same three shapes.
 *
 * `null` for a reference with no id, or with anything after the brackets.
 */
export const parseFrom = (reference: string): FromReference | null => {
  const written = reference.trim()
  const bracket = /^([^[\].\s]+)\[([^\]\s]+)\]$/u.exec(written)
  if (bracket) {
    return { attribute: bracket[2] as string, id: bracket[1] as string }
  }
  const dot = /^([^[\].\s]+)\.([^[\].\s]+)$/u.exec(written)
  if (dot) {
    return { id: dot[1] as string, property: dot[2] as string }
  }
  return /^[^[\].\s]+$/u.test(written) ? { id: written } : null
}

/**
 * The text a `from` reference names, looked up in the tree `scope` is in, or
 * `null` where the element or its attribute is not there.
 */
export const readFrom = (reference: string, scope: Element): string | null => {
  const parsed = parseFrom(reference)
  const element = parsed ? elementById(scope, parsed.id) : null
  if (!(parsed && element)) {
    return null
  }
  if (parsed.attribute !== undefined) {
    return element.getAttribute(parsed.attribute)
  }
  if (parsed.property !== undefined) {
    const read = (element as unknown as Record<string, unknown>)[parsed.property]
    return read === undefined || read === null ? null : String(read)
  }
  return element.textContent
}
