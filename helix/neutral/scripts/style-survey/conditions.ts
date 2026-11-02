/**
 * The simple selectors inside one compound: attributes, pseudo-classes that
 * take no selector, and pseudo-elements. `selectors.ts` handles the ones that
 * hold selectors, `:host()`, `:is()`, `:not()`, `:has()`, and `::slotted()`.
 */

import {
  type AttributeSelector,
  type Nth,
  type Pseudo,
  print,
  type SelectorPart,
} from './syntax.js'
import { type Finding, missing, named, webOnly } from './verdict.js'

/**
 * What a compound's simple selectors describe. `host` is the element, `part`
 * a part in its shadow tree, `region` a `<slot>`, and `slotted` content passed
 * into one.
 */
export type Scope = 'host' | 'part' | 'region' | 'slotted'

/** Pseudo-classes the language names, wherever they appear. */
const CONDITIONS: Readonly<Record<string, string>> = {
  active: 'when:pressed',
  dir: 'when:dir',
  disabled: 'when:disabled',
  'first-child': 'when:place',
  'focus-visible': 'when:focus-visible',
  'focus-within': 'when:focus-within',
  hover: 'when:hover',
  'last-child': 'when:place',
}

/** Pseudo-classes the web keeps as named constructs. */
const WEB_CONDITIONS: Readonly<Record<string, string>> = {
  'first-of-type': 'web:position-selector',
  'last-of-type': 'web:position-selector',
  'nth-last-child': 'web:position-selector',
  'nth-last-of-type': 'web:position-selector',
  'nth-of-type': 'web:position-selector',
  'only-child': 'web:position-selector',
  'popover-open': 'web:popover-open',
}

/** What passed content may be conditioned on: its place and the pointer. */
const SLOTTED_CONDITIONS: ReadonlySet<string> = new Set([
  'active',
  'first-child',
  'focus-visible',
  'focus-within',
  'hover',
  'last-child',
])

/** Pseudo-elements the language names, and the web-only ones. */
const PSEUDO_ELEMENTS: Readonly<Record<string, (text: string) => Finding>> = {
  after: (text) => named('on:after', text),
  backdrop: (text) => webOnly('web:backdrop', text),
  before: (text) => named('on:before', text),
  part: (text) => webOnly('web:part', text),
}

const VENDOR = /^-(?:moz|ms|o|webkit)-/

/** True for `[part="x"]` and `[part~="x"]`. */
export const isPartAttribute = (part: SelectorPart): boolean =>
  part.type === 'AttributeSelector' && part.name.name === 'part'

/** True for the attribute that names a region: `name` on a `<slot>`. */
const namesRegion = (attribute: AttributeSelector, scope: Scope): boolean =>
  (scope === 'region' && attribute.name.name === 'name') ||
  (scope === 'slotted' && attribute.name.name === 'slot')

/**
 * An attribute selector. On the host it is a prop, on a part or a region a
 * state the part publishes, and on passed content anything but `slot` is a
 * condition the language has no word for.
 */
export const attributeFindings = (attribute: AttributeSelector, scope: Scope): Finding[] => {
  const text = print(attribute)
  if (isPartAttribute(attribute) || namesRegion(attribute, scope)) {
    return []
  }
  if (attribute.matcher !== null && attribute.matcher !== '=') {
    return [missing('selector:attribute-matcher', text)]
  }
  if (scope === 'slotted') {
    return [missing('selector:slotted-condition', text)]
  }
  return [named(scope === 'host' ? 'when:prop' : 'when:part-state', text)]
}

/**
 * `:nth-child()`. A plain index is a child's place; a formula, or `of S`, is
 * the web's position selector.
 */
const nthFindings = (pseudo: Pseudo): Finding[] => {
  const text = print(pseudo)
  const [argument] = pseudo.children ?? []
  const nth = argument?.type === 'Nth' ? (argument as Nth) : undefined
  if (nth !== undefined && nth.nth.a === null && nth.selector === null) {
    return [named('when:place', text)]
  }
  return [webOnly('web:position-selector', text)]
}

/** `:state()`: the host's own state, or the state of a part that is an element. */
const stateFindings = (pseudo: Pseudo, scope: Scope): Finding[] => {
  const text = print(pseudo)
  if (scope === 'slotted') {
    return [missing('selector:slotted-condition', text)]
  }
  return [named(scope === 'host' ? 'when:state' : 'when:part-state', text)]
}

/**
 * A pseudo-class that holds no selector. Passed content takes only its place
 * and the pointer's conditions.
 */
export const pseudoClassFindings = (pseudo: Pseudo, scope: Scope): Finding[] => {
  const text = print(pseudo)
  if (pseudo.name === 'state') {
    return stateFindings(pseudo, scope)
  }
  if (pseudo.name === 'nth-child') {
    return nthFindings(pseudo)
  }
  const web = WEB_CONDITIONS[pseudo.name]
  if (web !== undefined) {
    return [webOnly(web, text)]
  }
  const condition = CONDITIONS[pseudo.name]
  if (condition === undefined) {
    return [missing(`selector:${pseudo.name}`, text)]
  }
  if (scope === 'slotted' && !SLOTTED_CONDITIONS.has(pseudo.name)) {
    return [missing('selector:slotted-condition', text)]
  }
  return [named(condition, text)]
}

/**
 * A pseudo-element other than `::slotted()`. `::before` and `::after` are the
 * parts of the same names, and a vendor's own is web-only.
 */
export const pseudoElementFindings = (pseudo: Pseudo): Finding[] => {
  const text = print(pseudo)
  const known = PSEUDO_ELEMENTS[pseudo.name]
  if (known !== undefined) {
    return [known(text)]
  }
  if (VENDOR.test(pseudo.name)) {
    return [webOnly('web:vendor-pseudo', text)]
  }
  return [missing(`selector:${pseudo.name}`, text)]
}

/**
 * An element name inside `::slotted()`. `*` is any content, a custom element
 * is passed content of that tag, and an HTML element has no counterpart on a
 * native view.
 */
export const slottedTypeFindings = (name: string): Finding[] => {
  if (name === '*') {
    return []
  }
  if (name.includes('-')) {
    return [named('slotted:element', name)]
  }
  return [missing('selector:slotted-html-element', name)]
}
