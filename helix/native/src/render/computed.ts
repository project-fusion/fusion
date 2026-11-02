/**
 * The values an element computes from its props, as its form's `derived`
 * names them, and the props a derivation is called with.
 *
 * **A derivation reads the element's props by the web's names**, each region
 * by its name as what is passed into it, and `locale` as the element's own or,
 * where it names none, the locale its words are in: the nearest `lang`, then
 * the reader's. **An element that keeps a clock gives `now` as well**, the
 * time of day of its last tick, in milliseconds.
 */

import type { Entry } from '@fusion.dev/helix-core/derivations'
import * as derivations from '@fusion.dev/helix-core/derivations'
import type { Family, Node } from '../style/form'
import { compute } from '../style/values'
import { type Behavior, boundBy } from './behavior'

/** What a computed value is read from: the element, and how a prop is read. */
interface Reading {
  readonly family: Family
  /** The locale the element's words are in, where it names none of its own. */
  readonly locale?: string
}

/** The name of every region a tree draws. */
const regionsOf = (nodes: readonly Node[] | undefined): string[] =>
  (nodes ?? []).flatMap((node) => [
    ...(node.kind === 'region' ? [node.name] : []),
    ...regionsOf(node.children),
  ])

/** The names a derivation reads for each family, worked out once each. */
const named = new WeakMap<Family, readonly string[]>()

/** The props and the regions a derivation of `family` reads, by their web names. */
const namesOf = (family: Family): readonly string[] => {
  let names = named.get(family)
  if (names === undefined) {
    names = [
      ...new Set([
        ...(family.api?.props ?? []).map((prop) => prop.name),
        ...regionsOf(family.tree),
        ...(family.api?.clock === undefined ? [] : ['now']),
        /* What an entry lays for its derivations: its text and its caret. */
        ...[family.api?.entry?.typed, family.api?.entry?.caret].filter(
          (name): name is string => name !== undefined,
        ),
      ]),
    ]
    named.set(family, names)
  }
  return names
}

/**
 * What core's derivation `name` computes for an element, from each of its
 * props and regions as `given` reads them, with `locale` its own where it
 * names one and the locale its words are in otherwise.
 */
export const derivedFor = (
  reading: Reading,
  name: string,
  given: (name: string) => unknown,
): boolean | string | undefined => compute(name, propsFor(reading, given))

/** The props a derivation is called with, as `derivedFor` says. */
export const propsFor = (
  reading: Reading,
  given: (name: string) => unknown,
): Record<string, unknown> => {
  const props: Record<string, unknown> = {}
  for (const one of namesOf(reading.family)) {
    props[one] = given(one)
  }
  if ((typeof props.locale !== 'string' || props.locale === '') && reading.locale !== undefined) {
    props.locale = reading.locale
  }
  return props
}

/**
 * The list core's derivation `name` computes for an element, from its props
 * as `derivedFor` reads them, or none where `name` is no list derivation.
 */
export const listedFor = (
  reading: Reading,
  name: string,
  given: (name: string) => unknown,
): readonly Entry[] => {
  const derivation = (derivations as Readonly<Record<string, unknown>>)[name]
  if (typeof derivation !== 'function') {
    return []
  }
  const listed: unknown = derivation(propsFor(reading, given))
  return Array.isArray(listed) ? (listed as readonly Entry[]) : []
}

/**
 * A prop as a derivation reads it. **A prop no attribute writes is the
 * element around's to write**, as a drilldown writes its rows `listed`, and
 * a phone's machines lay it over the host: the value laid there, where one
 * is, and `given` otherwise. **A name no prop has is a value a machine
 * lays**, as an entry lays its text and its caret.
 */
export const laidOr = (
  values: { readonly behavior: Behavior; readonly family: Family },
  name: string,
  given: unknown,
): unknown => {
  const prop = values.family.api?.props.find((one) => one.name === name)
  const laid =
    prop === undefined || prop.attribute === false
      ? boundBy(values.behavior, 'host', name)
      : undefined
  return laid ?? given
}

/** Whether a region holds something: an element, words, or a number. */
export const holdsContent = (content: unknown): boolean =>
  content !== undefined && content !== null && content !== false && content !== ''

/** The value `name` the element computes, as its form's `derived` declares it. */
export const computedAttribute = (
  family: Family,
  name: string,
): { readonly bind: string } | { readonly derive: string } | undefined => {
  const attribute = family.api?.derived?.[name]
  return typeof attribute === 'object' &&
    attribute !== null &&
    ('bind' in attribute || 'derive' in attribute)
    ? (attribute as { readonly bind: string } | { readonly derive: string })
    : undefined
}
