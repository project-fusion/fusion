/**
 * Classifies an at-rule: a condition a rule sits inside, a motion construct,
 * or a web-only one.
 *
 * **A box width has to name a breakpoint token, and Helix has none yet.** A
 * container query cannot read a custom property, so the compiler would write a
 * token's value as a literal. A literal width in today's CSS is expressible
 * once a breakpoint token holds that value, and until then it is reported as
 * `at-rule:box-width-literal`.
 */

import { type Atrule, print } from './syntax.js'
import { type Finding, missing, named, webOnly } from './verdict.js'

/** A media or container feature, as the classifiers read it. */
interface Feature {
  /**
   * The feature's name, such as `hover` or `inline-size`.
   */
  readonly name: string
  /**
   * The feature written out, for the report.
   */
  readonly text: string
  /**
   * Its value, such as `coarse`, or an empty string for a range.
   */
  readonly value: string
}

/** A node of an at-rule's prelude, read loosely: the walk reads only a few fields. */
interface PreludeNode {
  readonly children?: readonly PreludeNode[]
  readonly condition?: PreludeNode | null
  readonly left?: { readonly name?: string; readonly type: string }
  readonly mediaType?: string | null
  readonly modifier?: string | null
  readonly name?: string
  readonly type: string
  readonly value?: object | null
}

/** Media features each with the construct it maps to. */
const MEDIA_FEATURES: Readonly<Record<string, (feature: Feature) => Finding>> = {
  'any-hover': ({ text }) => named('when:hover-capability', text),
  'any-pointer': ({ text }) => named('when:pointer', text),
  'forced-colors': ({ text }) => webOnly('web:forced-colors', text),
  height: ({ text }) => missing('at-rule:viewport-height', text),
  hover: ({ text }) => named('when:hover-capability', text),
  'max-width': ({ text }) => named('when:viewport-width', text),
  'min-width': ({ text }) => named('when:viewport-width', text),
  pointer: ({ text }) => named('when:pointer', text),
  'prefers-contrast': ({ text }) => named('when:contrast', text),
  'prefers-reduced-motion': ({ text }) => named('when:reduced-motion', text),
  width: ({ text }) => named('when:viewport-width', text),
}

/** Media types: `print` is web-only, and the rest have no meaning on a phone. */
const mediaTypeFindings = (query: PreludeNode): Finding[] => {
  const type = query.mediaType
  if (type === null || type === undefined || type === 'all') {
    return []
  }
  const text = `${query.modifier ?? ''} ${type}`.trim()
  if (type === 'print' && query.modifier !== 'not') {
    return [webOnly('web:print', text)]
  }
  return [missing('at-rule:media-type', text)]
}

const featureOf = (node: PreludeNode): Feature => {
  const text = print(node)
  if (node.type === 'FeatureRange') {
    return { name: node.left?.name ?? '', text, value: '' }
  }
  return { name: node.name ?? '', text, value: node.value ? print(node.value) : '' }
}

/** Every feature in a prelude, depth first, and every `not` or `or` between them. */
const walk = (node: PreludeNode, found: PreludeNode[]): PreludeNode[] => {
  const isOperator = node.type === 'Identifier' && (node.name === 'not' || node.name === 'or')
  if (node.type === 'Feature' || node.type === 'FeatureRange' || isOperator) {
    found.push(node)
  }
  if (node.type === 'GeneralEnclosed' || node.type === 'Raw') {
    found.push(node)
  }
  for (const child of [...(node.children ?? []), ...(node.condition ? [node.condition] : [])]) {
    walk(child, found)
  }
  return found
}

const conditionNodeFindings = (
  node: PreludeNode,
  features: Readonly<Record<string, (feature: Feature) => Finding>>,
  kind: string,
): Finding => {
  if (node.type === 'Identifier') {
    return node.name === 'not' ? named('when:not', 'not') : named('when:any-of', 'or')
  }
  if (node.type !== 'Feature' && node.type !== 'FeatureRange') {
    return missing(`at-rule:${kind}-condition`, print(node))
  }
  const feature = featureOf(node)
  const known = features[feature.name]
  return known === undefined
    ? missing(`at-rule:${kind}-${feature.name}`, feature.text)
    : known(feature)
}

/** Every node of one type in a prelude. */
const collect = (node: PreludeNode, type: string): PreludeNode[] => [
  ...(node.type === type ? [node] : []),
  ...(node.children ?? []).flatMap((child) => collect(child, type)),
]

const mediaFindings = (atrule: Atrule): Finding[] => {
  const prelude = atrule.prelude as PreludeNode | null
  if (prelude === null) {
    return [missing('at-rule:media-condition', '@media')]
  }
  return [
    ...collect(prelude, 'MediaQuery').flatMap(mediaTypeFindings),
    ...walk(prelude, []).map((node) => conditionNodeFindings(node, MEDIA_FEATURES, 'media')),
  ]
}

/** Container features: an inline or block size of the box itself. */
const CONTAINER_FEATURES: Readonly<Record<string, (feature: Feature) => Finding>> = {
  'block-size': ({ text }) => missing('at-rule:box-width-literal', text),
  height: ({ text }) => missing('at-rule:box-width-literal', text),
  'inline-size': ({ text }) => missing('at-rule:box-width-literal', text),
  width: ({ text }) => missing('at-rule:box-width-literal', text),
}

const containerFindings = (atrule: Atrule): Finding[] => {
  const prelude = atrule.prelude as PreludeNode | null
  if (prelude === null) {
    return [missing('at-rule:container-condition', '@container')]
  }
  const names = (prelude.children ?? []).filter((child) => child.type === 'Identifier')
  return [
    ...names.map((name) => missing('at-rule:named-container', print(name))),
    ...walk(prelude, []).map((node) =>
      conditionNodeFindings(node, CONTAINER_FEATURES, 'container'),
    ),
  ]
}

const textOf = (atrule: Atrule): string =>
  atrule.prelude === null ? `@${atrule.name}` : `@${atrule.name} ${print(atrule.prelude)}`

/** At-rules each with its handler. */
const AT_RULES: Readonly<Record<string, (atrule: Atrule) => Finding[]>> = {
  container: containerFindings,
  keyframes: (atrule) => [named('motion:keyframes', textOf(atrule))],
  media: mediaFindings,
  'starting-style': (atrule) => [named('motion:starting-style', textOf(atrule))],
  supports: (atrule) => [webOnly('web:enhance', textOf(atrule))],
}

/** Classifies one at-rule by its name and its prelude. */
export const classifyAtRule = (atrule: Atrule): Finding[] => {
  const handler = AT_RULES[atrule.name]
  return handler === undefined
    ? [missing(`at-rule:${atrule.name}`, textOf(atrule))]
    : handler(atrule)
}

/** The at-rule written out on one line, for the report. */
export const atRuleText = textOf

/** True for an at-rule whose rules are frames: `@keyframes` and its vendor forms. */
export const holdsFrames = (atrule: Atrule): boolean => atrule.name.endsWith('keyframes')
