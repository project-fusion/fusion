/**
 * Classifies one declaration: its property against the grammar's allowlist,
 * then its value.
 *
 * **A property outside the grammar reports that alone.** Its value is not
 * read, so each such declaration counts once, under the property's group. A
 * web-only property's value is not read either, because the compiler writes it
 * as it stands.
 */

import { ANIMATABLE, DISCRETE, propertyConstruct } from './properties.js'
import { type Declaration, print, type Value, type ValueNode } from './syntax.js'
import { type ValueContext, valueFindings } from './values.js'
import { type Finding, missing, named, webOnly } from './verdict.js'

/** Where a declaration sits. */
export interface DeclarationContext extends ValueContext {
  /**
   * True inside `@keyframes` or `@starting-style`, where every property is
   * animated.
   */
  readonly motion: boolean
}

/** The `display` values the grammar allows. */
const DISPLAYS: ReadonlySet<string> = new Set([
  'block',
  'contents',
  'flex',
  'grid',
  'inline-flex',
  'inline-grid',
  'none',
])

/** `position` values: the two every platform has, and the two only the web has. */
const POSITIONS: Readonly<Record<string, (text: string) => Finding[]>> = {
  absolute: () => [],
  fixed: (text) => [webOnly('web:position-fixed', text)],
  relative: () => [],
  static: () => [],
  sticky: (text) => [webOnly('web:position-sticky', text)],
}

/** Easing and behavior keywords a transition entry may hold beside its property. */
const TIMING_WORDS: ReadonlySet<string> = new Set([
  'allow-discrete',
  'ease',
  'ease-in',
  'ease-in-out',
  'ease-out',
  'linear',
  'normal',
  'step-end',
  'step-start',
])

const childrenOf = (declaration: Declaration): readonly ValueNode[] =>
  declaration.value.type === 'Value' ? declaration.value.children : []

/** The single keyword a value is, or `undefined` when it is anything else. */
const keywordOf = (declaration: Declaration): string | undefined => {
  const children = childrenOf(declaration)
  const [only] = children
  return children.length === 1 && only?.type === 'Identifier' ? only.name : undefined
}

/** A value split at its top-level commas. */
const entries = (value: Value): ValueNode[][] =>
  value.children.reduce<ValueNode[][]>(
    (groups, node) => {
      if (node.type === 'Operator' && node.value.trim() === ',') {
        groups.push([])
      } else {
        groups.at(-1)?.push(node)
      }
      return groups
    },
    [[]],
  )

/**
 * The property a transition entry animates: the first keyword that is not an
 * easing. With none, a reference may supply it, and otherwise it is `all`.
 */
const transitionTarget = (entry: readonly ValueNode[]): string | undefined => {
  const word = entry.find((node) => node.type === 'Identifier' && !TIMING_WORDS.has(node.name))
  if (word?.type === 'Identifier') {
    return word.name
  }
  return entry.some((node) => node.type === 'Function' && node.name === 'var') ? undefined : 'all'
}

/** Whether a property may animate: on every platform, on the web alone, or not at all. */
const animatedFindings = (property: string, text: string): Finding[] => {
  if (ANIMATABLE.has(property) || property === 'none') {
    return []
  }
  if (DISCRETE.has(property)) {
    return [webOnly('web:discrete-transition', text)]
  }
  if (property === 'all') {
    return [missing('motion:all', text)]
  }
  if (property.startsWith('--')) {
    return [missing('motion:custom-property', text)]
  }
  return [missing('motion:not-animatable', text)]
}

/** `transition` and `transition-property`: each entry's property must animate. */
const transitionFindings = (declaration: Declaration): Finding[] => {
  if (declaration.value.type !== 'Value') {
    return []
  }
  return entries(declaration.value).flatMap((entry) => {
    const target = transitionTarget(entry)
    return target === undefined ? [] : animatedFindings(target, target)
  })
}

const displayFindings = (declaration: Declaration): Finding[] => {
  const keyword = keywordOf(declaration)
  return keyword === undefined || DISPLAYS.has(keyword)
    ? []
    : [missing('value:display', `display: ${keyword}`)]
}

const positionFindings = (declaration: Declaration): Finding[] => {
  const keyword = keywordOf(declaration)
  if (keyword === undefined) {
    return []
  }
  const known = POSITIONS[keyword]
  return known === undefined
    ? [missing('value:position', `position: ${keyword}`)]
    : known(`position: ${keyword}`)
}

/** `subgrid` in a track list, which the web keeps. */
const tracksFindings = (declaration: Declaration): Finding[] =>
  childrenOf(declaration).some((node) => node.type === 'Identifier' && node.name === 'subgrid')
    ? [webOnly('web:subgrid', print(declaration))]
    : []

/** Checks on the value of a property the grammar allows, by property. */
const REFINE: Readonly<Record<string, (declaration: Declaration) => Finding[]>> = {
  display: displayFindings,
  'grid-template-columns': tracksFindings,
  'grid-template-rows': tracksFindings,
  position: positionFindings,
  transition: transitionFindings,
  'transition-property': transitionFindings,
}

/** A value with one part: a color, a gradient, a reference, or `none`. */
const isSingle = (declaration: Declaration): boolean => childrenOf(declaration).length === 1

/**
 * Properties whose category depends on the value. A grid placement that names
 * an area reads `grid-template-areas`, which is web-only, and a `background`
 * that is one color or one gradient is what the grammar's background is.
 */
const REPLACE: Readonly<Record<string, (declaration: Declaration) => Finding[] | undefined>> = {
  background: (declaration) =>
    isSingle(declaration) ? [named('set:background', print(declaration))] : undefined,
  'grid-area': (declaration) => namedArea(declaration),
  'grid-column': (declaration) => namedArea(declaration),
  'grid-row': (declaration) => namedArea(declaration),
}

const namedArea = (declaration: Declaration): Finding[] | undefined => {
  const keyword = keywordOf(declaration)
  return keyword === undefined || keyword === 'auto'
    ? undefined
    : [webOnly('web:template-areas', print(declaration))]
}

/** A custom property: an own value, a value handed to a child, or a token redefined. */
const customFinding = (property: string): Finding => {
  if (property.startsWith('--_')) {
    return named('values', property)
  }
  return property.startsWith('--helix-')
    ? missing('property:token-override', property)
    : named('set:inherited', property)
}

const valuesOf = (declaration: Declaration, context: ValueContext): Finding[] => {
  if (declaration.value.type === 'Raw') {
    const raw = declaration.value.value.trim()
    return raw === '' ? [] : [missing('value:unparsed', raw)]
  }
  return valueFindings(declaration.value.children, context)
}

const propertyFindings = (declaration: Declaration, context: DeclarationContext): Finding[] => {
  const property = declaration.property
  if (property.startsWith('--')) {
    return [customFinding(property), ...valuesOf(declaration, context)]
  }
  const replaced = REPLACE[property]?.(declaration)
  if (replaced !== undefined) {
    return [...replaced, ...valuesOf(declaration, context)]
  }
  const construct = propertyConstruct(property)
  if (construct.startsWith('property:')) {
    return [missing(construct, property)]
  }
  if (construct.startsWith('web:')) {
    return [webOnly(construct, property)]
  }
  const refine = REFINE[property] ?? (() => [])
  return [named(construct, property), ...valuesOf(declaration, context), ...refine(declaration)]
}

/**
 * Inside `@keyframes` or `@starting-style`, a property the grammar has must
 * also animate. One outside the grammar is reported as that already.
 */
const motionFindings = (declaration: Declaration, context: DeclarationContext): Finding[] => {
  const property = declaration.property
  const inGrammar = property.startsWith('--') || propertyConstruct(property).startsWith('set:')
  return context.motion && inGrammar ? animatedFindings(property, property) : []
}

/** Classifies one declaration in its context. */
export const classifyDeclaration = (
  declaration: Declaration,
  context: DeclarationContext,
): Finding[] => {
  const important = declaration.important ? [missing('declaration:important', '!important')] : []
  return [
    ...important,
    ...motionFindings(declaration, context),
    ...propertyFindings(declaration, context),
  ]
}
