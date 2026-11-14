import { ELEMENTS, type ElementKind, ROLES, type Role } from '../ir.generated.js'
import type { Node } from '../style/form'
import { bound, type Values } from './styles'

/**
 * What a phone announces a node as: React Native's `accessibilityRole`, or
 * its `role` where the platform has no trait of that name, as the
 * vocabulary's tables give each. **A role the node names wins over the kind
 * of element it is**, as it does on the web.
 */
export const announcedAs = (values: Values, node: Node): Readonly<Record<string, string>> => {
  const role = bound(values, node.attributes?.role, node.name)
  if (typeof role === 'string' && role in ROLES) {
    return ROLES[role as Role]
  }
  const kind = kindOf(bound(values, node.attributes?.element, node.name))
  if (kind !== undefined) {
    const { tag: _tag, ...announced } = ELEMENTS[kind]
    return announced
  }
  return {}
}

/**
 * The kind of element a node is: its name, or the web tag a prop bound to
 * it holds, as Text's `as` does. **`h1` to `h6` are a heading**, whose tag is
 * `h` and its level.
 */
const kindOf = (element: unknown): ElementKind | undefined => {
  if (typeof element !== 'string') {
    return undefined
  }
  if (element in ELEMENTS) {
    return element as ElementKind
  }
  const tag = /^h[1-6]$/.test(element) ? 'h' : element
  return (Object.keys(ELEMENTS) as ElementKind[]).find((kind) => ELEMENTS[kind].tag === tag)
}

/** A reading as a number, from a number or the words of one. */
const numberOf = (value: unknown): number | undefined => {
  const number = typeof value === 'string' && value.trim() !== '' ? Number(value) : value
  return typeof number === 'number' && Number.isFinite(number) ? number : undefined
}

/** The fields of `accessibilityValue`, by the attribute each is read from. */
const READING = { max: 'valuemax', min: 'valuemin', now: 'valuenow', text: 'valuetext' } as const

/**
 * A range's reading, as `accessibilityValue`: its least and greatest, where
 * it stands, and the words it is read as. A progress bar that does not know
 * where it stands has no `now`, and nothing where none of the four is set.
 */
export const readingOf = (
  values: Values,
  node: Node,
): { accessibilityValue?: Readonly<Record<string, number | string>> } => {
  const reading: Record<string, number | string> = {}
  for (const [field, attribute] of Object.entries(READING)) {
    const value = bound(values, node.attributes?.[attribute], node.name)
    if (field === 'text') {
      if (typeof value === 'string' && value !== '') {
        reading.text = value
      }
      continue
    }
    const number = numberOf(value)
    if (number !== undefined) {
      reading[field] = number
    }
  }
  return Object.keys(reading).length === 0 ? {} : { accessibilityValue: reading }
}

/** Whether a flag attribute holds: `true`, or the prop `bind()` reads set, or the one `not()` reads unset. */
export const holds = (values: Values, node: Node, name: string): boolean =>
  Boolean(bound(values, node.attributes?.[name], node.name))
