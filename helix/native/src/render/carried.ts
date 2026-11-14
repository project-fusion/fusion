/**
 * The custom properties a node carries, by name after `--`, as the web
 * writes a meter's `--meter-fraction` in its fill's style: what a rule's
 * `measured()` reads on the part.
 */
import type { Node } from '../style/form'

/** A custom property's value: a number, words that are one as that number, other words, or nothing. */
const measurement = (set: unknown): number | string | undefined => {
  const number = typeof set === 'string' && set.trim() !== '' ? Number(set) : set
  if (typeof number === 'number' && Number.isFinite(number)) {
    return number
  }
  return typeof set === 'string' && set !== '' ? set : undefined
}

/**
 * Each custom property `node` carries, with `read` giving what an attribute
 * holds, as a prop or a computed value it binds. A number written as words
 * is a number.
 */
export const carried = (
  node: Node,
  read: (attribute: unknown) => unknown,
): Record<string, number | string> => {
  const measured: Record<string, number | string> = {}
  for (const [key, attribute] of Object.entries(node.attributes ?? {})) {
    const set = key.startsWith('--') ? measurement(read(attribute)) : undefined
    if (set !== undefined) {
      measured[key.slice(2)] = set
    }
  }
  return measured
}
