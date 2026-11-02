/**
 * Classifies one complex selector from a rule's list into what a rule's `on`
 * and `when` say.
 *
 * **The last compound is what the rule styles, and the ones before it are
 * conditions.** A `:host(...)` before it holds the host's conditions, and a
 * part before it is a condition on another part. A `+` or a `~` between two
 * compounds is the web's sibling selector, which a native view leaves out.
 */

import {
  attributeFindings,
  isPartAttribute,
  pseudoClassFindings,
  pseudoElementFindings,
  type Scope,
  slottedTypeFindings,
} from './conditions.js'
import {
  type AttributeSelector,
  type Named,
  type Pseudo,
  print,
  type Selector,
  type SelectorPart,
} from './syntax.js'
import { type Finding, missing, named, webOnly } from './verdict.js'

/**
 * What a compound selects. `none` is a node with no part name, and `other` a
 * compound whose simple selectors report themselves: a class, an id, a list
 * with combinators, or pseudo-elements alone.
 */
type Subject =
  | 'element'
  | 'host'
  | 'none'
  | 'other'
  | 'part'
  | 'parts'
  | 'region'
  | 'slotted'
  | 'universal'

/** Where a compound sits: the target, a condition before it, or inside `:has()`. */
type Position = 'context' | 'relative' | 'subject'

/** A compound selector and the combinator before it. */
interface Compound {
  /**
   * ` `, `>`, `+`, or `~`, or `null` for the first compound.
   */
  readonly combinator: string | null
  /**
   * Its simple selectors.
   */
  readonly parts: readonly SelectorPart[]
}

/** What the simple selectors of each kind of compound describe. */
const SCOPES: Readonly<Record<Subject, Scope>> = {
  element: 'part',
  host: 'host',
  none: 'part',
  other: 'part',
  part: 'part',
  parts: 'part',
  region: 'region',
  slotted: 'region',
  universal: 'part',
}

type Report = (text: string) => Finding[]

const none: Report = () => []

/** What each subject says as the target of a rule. */
const AS_SUBJECT: Readonly<Record<Subject, Report>> = {
  element: (text) => [missing('selector:element-type', text)],
  host: (text) => [named('on:host', text)],
  none: (text) => [missing('selector:unnamed-node', text)],
  other: none,
  part: (text) => [named('on:part', text)],
  parts: (text) => [named('on:parts', text)],
  region: (text) => [named('on:region', text)],
  slotted: (text) => [named('on:slotted', text)],
  universal: (text) => [missing('selector:universal', text)],
}

/** What each subject says before the target. */
const AS_CONTEXT: Readonly<Record<Subject, Report>> = {
  ...AS_SUBJECT,
  host: none,
  part: (text) => [named('when:part', text)],
  parts: (text) => [named('when:part', text)],
  region: (text) => [named('when:part', text)],
  slotted: (text) => [missing('selector:after-slotted', text)],
}

/** What each subject says inside `:has()`, where only its presence counts. */
const AS_RELATIVE: Readonly<Record<Subject, Report>> = {
  ...AS_CONTEXT,
  host: (text) => [missing('selector:host-in-has', text)],
  none,
  part: none,
  parts: none,
  region: none,
  universal: none,
}

const POSITIONS: Readonly<Record<Position, Readonly<Record<Subject, Report>>>> = {
  context: AS_CONTEXT,
  relative: AS_RELATIVE,
  subject: AS_SUBJECT,
}

const isPseudo = (part: SelectorPart, type: Pseudo['type'], name: string): boolean =>
  part.type === type && part.name === name

const hasCombinator = (selector: Selector): boolean =>
  selector.children.some((part) => part.type === 'Combinator')

const textOf = (parts: readonly SelectorPart[]): string =>
  print({ children: parts, type: 'Selector' })

/** The selectors a pseudo-class or pseudo-element holds. */
const selectorsOf = (pseudo: Pseudo): Selector[] =>
  (pseudo.children ?? []).flatMap((child) => {
    if (child.type === 'SelectorList') {
      return [...child.children]
    }
    return child.type === 'Selector' ? [child] : []
  })

/** `:is([part="a"], [part="b"])`: several parts that share a rule. */
const isPartList = (part: SelectorPart): boolean =>
  part.type === 'PseudoClassSelector' &&
  (part.name === 'is' || part.name === 'where') &&
  selectorsOf(part).every(
    (selector) => !hasCombinator(selector) && selector.children.some(isPartAttribute),
  )

const typeSubject = (name: string | undefined): Subject => {
  if (name === 'slot') {
    return 'region'
  }
  return name === '*' ? 'universal' : 'element'
}

/**
 * The subject an `:is()` or `:where()` gives a compound that has none of its
 * own: several parts, or elements. A list with combinators reports itself.
 */
const listSubject = (parts: readonly SelectorPart[]): Subject | undefined => {
  const list = parts.find(
    (part) =>
      isPseudo(part, 'PseudoClassSelector', 'is') || isPseudo(part, 'PseudoClassSelector', 'where'),
  )
  if (list === undefined || list.type !== 'PseudoClassSelector') {
    return undefined
  }
  const selectors = selectorsOf(list)
  if (selectors.some(hasCombinator)) {
    return 'other'
  }
  const subjects = selectors.map((selector) => subjectOf(selector.children))
  if (subjects.every((subject) => subject === 'part')) {
    return 'parts'
  }
  return subjects.every((subject) => subject === 'element' || subject === 'universal')
    ? 'element'
    : undefined
}

/** A compound that only a class, an id, or pseudo-elements make up reports itself. */
const reportsItself = (parts: readonly SelectorPart[]): boolean =>
  parts.some((part) => part.type === 'ClassSelector' || part.type === 'IdSelector') ||
  parts.every((part) => part.type === 'PseudoElementSelector')

const subjectOf = (parts: readonly SelectorPart[]): Subject => {
  if (parts.some((part) => isPseudo(part, 'PseudoClassSelector', 'host'))) {
    return 'host'
  }
  if (parts.some((part) => isPseudo(part, 'PseudoElementSelector', 'slotted'))) {
    return 'slotted'
  }
  if (parts.some(isPartAttribute)) {
    return 'part'
  }
  const type = parts.find((part): part is Named => part.type === 'TypeSelector')
  if (type !== undefined) {
    return typeSubject(type.name)
  }
  return listSubject(parts) ?? (reportsItself(parts) ? 'other' : 'none')
}

/** Splits a complex selector, or a relative one inside `:has()`, at its combinators. */
export const compoundsOf = (selector: Selector): Compound[] => {
  const compounds: Compound[] = []
  let combinator: string | null = null
  let parts: SelectorPart[] = []
  for (const part of selector.children) {
    if (part.type !== 'Combinator') {
      parts.push(part)
      continue
    }
    if (parts.length > 0) {
      compounds.push({ combinator, parts })
    }
    combinator = part.name.trim() || ' '
    parts = []
  }
  if (parts.length > 0) {
    compounds.push({ combinator, parts })
  }
  return compounds
}

const combinatorFindings = (combinator: string | null): Finding[] =>
  combinator === '+' || combinator === '~' ? [webOnly('web:sibling', combinator)] : []

/** `:host(...)`: the host's own conditions. */
const hostFindings = (pseudo: Pseudo): Finding[] =>
  selectorsOf(pseudo).flatMap((selector) =>
    hasCombinator(selector)
      ? [missing('selector:host-complex', print(selector))]
      : selector.children.flatMap((part) => simpleFindings(part, 'host')),
  )

/** `::slotted(...)`: which passed content, and under what conditions. */
const slottedFindings = (pseudo: Pseudo): Finding[] =>
  selectorsOf(pseudo).flatMap((selector) =>
    selector.children.flatMap((part) => simpleFindings(part, 'slotted')),
  )

/** `:has(...)`: a condition on what a part or a region holds. */
const passedContentFindings = (pseudo: Pseudo): Finding[] => [
  named('when:passed-content', print(pseudo)),
  ...selectorsOf(pseudo).flatMap((selector) =>
    compoundsOf(selector).flatMap((compound) => [
      ...combinatorFindings(compound.combinator),
      ...compoundFindings(compound.parts, 'relative'),
    ]),
  ),
]

const anyOfArgument = (selector: Selector, scope: Scope): Finding[] => {
  const subject = subjectOf(selector.children)
  if (scope !== 'slotted' && (subject === 'element' || subject === 'universal')) {
    return [missing('selector:element-type', print(selector))]
  }
  return selector.children.flatMap((part) => simpleFindings(part, scope))
}

/**
 * `:is()` and `:where()`: several sets of conditions, any of which. A list of
 * parts is the subject `on: [...]`, so only their own conditions count here.
 */
const anyOfFindings = (pseudo: Pseudo, scope: Scope): Finding[] => {
  const selectors = selectorsOf(pseudo)
  if (selectors.some(hasCombinator)) {
    return [missing('selector:complex-any-of', print(pseudo))]
  }
  if (isPartList(pseudo)) {
    return selectors.flatMap((selector) => compoundConditions(selector.children, 'part'))
  }
  return [
    named('when:any-of', print(pseudo)),
    ...selectors.flatMap((selector) => anyOfArgument(selector, scope)),
  ]
}

const negatedAttributeFindings = (attribute: AttributeSelector, scope: Scope): Finding[] => {
  const text = print(attribute)
  const found = attributeFindings(attribute, scope)
  if (found.some((finding) => finding.category === 'not-expressible')) {
    return found
  }
  if (scope === 'host') {
    return attribute.matcher === null
      ? [named('when:prop-absent', text)]
      : [missing('selector:negated-prop-value', text)]
  }
  if (found.length === 0 && !isPartAttribute(attribute)) {
    return []
  }
  return [named('when:part-state', text), named('when:not', text)]
}

/** A negated pseudo-class. `:not(:first-child)` is the place `later`. */
const negatedPseudoFindings = (pseudo: Pseudo, scope: Scope): Finding[] => {
  const text = print(pseudo)
  if (pseudo.name === 'first-child') {
    return [named('when:place', text)]
  }
  const found = pseudoClassSelectorFindings(pseudo, scope)
  if (found.some((finding) => finding.name === 'when:place')) {
    return [missing('selector:negated-place', text)]
  }
  return [...found, named('when:not', text)]
}

const negatedFindings = (selector: Selector, scope: Scope): Finding[] => {
  const [only, ...rest] = selector.children
  if (only === undefined || rest.length > 0) {
    return [missing('selector:negated-compound', print(selector))]
  }
  if (only.type === 'AttributeSelector') {
    return negatedAttributeFindings(only, scope)
  }
  if (only.type === 'PseudoClassSelector') {
    return negatedPseudoFindings(only, scope)
  }
  return [missing('selector:negated-subject', print(selector))]
}

/** `:not(...)`: an absent prop on the host, or any boolean condition turned off. */
const negationFindings = (pseudo: Pseudo, scope: Scope): Finding[] =>
  selectorsOf(pseudo).flatMap((selector) => negatedFindings(selector, scope))

/** Pseudo-classes that hold selectors, each with its own handler. */
const HOLDERS: Readonly<Record<string, (pseudo: Pseudo, scope: Scope) => Finding[]>> = {
  has: passedContentFindings,
  host: hostFindings,
  is: anyOfFindings,
  not: negationFindings,
  where: anyOfFindings,
}

const pseudoClassSelectorFindings = (pseudo: Pseudo, scope: Scope): Finding[] => {
  const holder = HOLDERS[pseudo.name]
  return holder === undefined ? pseudoClassFindings(pseudo, scope) : holder(pseudo, scope)
}

/** One simple selector inside a compound, read in the compound's scope. */
const simpleFindings = (part: SelectorPart, scope: Scope): Finding[] => {
  switch (part.type) {
    case 'AttributeSelector':
      return attributeFindings(part, scope)
    case 'PseudoClassSelector':
      return pseudoClassSelectorFindings(part, scope)
    case 'PseudoElementSelector':
      return part.name === 'slotted' ? slottedFindings(part) : pseudoElementFindings(part)
    case 'TypeSelector':
      return scope === 'slotted' ? slottedTypeFindings(part.name ?? '*') : []
    case 'ClassSelector':
    case 'IdSelector':
    case 'NestingSelector':
      return [missing(`selector:${part.type.replace('Selector', '').toLowerCase()}`, print(part))]
    case 'Raw':
      return [missing('selector:unparsed', part.value)]
    default:
      return []
  }
}

/** A compound's conditions, without what it says about its subject. */
const compoundConditions = (parts: readonly SelectorPart[], scope: Scope): Finding[] => [
  ...parts
    .filter(isPartAttribute)
    .slice(1)
    .map((part) => named('when:part-state', print(part))),
  ...parts.flatMap((part) => simpleFindings(part, scope)),
]

const compoundFindings = (parts: readonly SelectorPart[], position: Position): Finding[] => {
  const subject = subjectOf(parts)
  return [
    ...POSITIONS[position][subject](textOf(parts)),
    ...compoundConditions(parts, SCOPES[subject]),
  ]
}

/** Classifies one complex selector from a style rule's list. */
export const classifySelector = (selector: Selector): Finding[] => {
  const compounds = compoundsOf(selector)
  return compounds.flatMap((compound, index) => [
    ...combinatorFindings(compound.combinator),
    ...compoundFindings(compound.parts, index === compounds.length - 1 ? 'subject' : 'context'),
  ])
}

/** Classifies a keyframe's offset, such as `from` or `50%`. */
export const classifyFrame = (selector: Selector): Finding[] => [
  named('motion:frame', print(selector)),
]
