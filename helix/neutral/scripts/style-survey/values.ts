/**
 * Classifies the parts of a value: references, functions, units, and the
 * keywords that have no typed form.
 *
 * **A plain literal reports nothing.** A number, a length in a unit the
 * language has, a hex color, a string, or a keyword is what a typed value is
 * made of, so only references, functions, and what the language lacks are
 * findings.
 */

import { type FunctionNode, type Identifier, print, type ValueNode } from './syntax.js'
import { type Finding, missing, named, webOnly } from './verdict.js'

/** Where a value's declaration sits. */
export interface ValueContext {
  /**
   * The family's hook prefix, such as `--button-`, or an empty string for a
   * stylesheet several families share.
   */
  readonly hookPrefix: string
}

/** Units the language has: points, `rem`, `em`, angles, times, and grid fractions. */
const UNITS: ReadonlySet<string> = new Set([
  'deg',
  'em',
  'fr',
  'grad',
  'ms',
  'px',
  'rad',
  'rem',
  's',
  'turn',
])

/** Units the language lacks, grouped by what they are relative to. */
const UNIT_GROUPS: Readonly<Record<string, string>> = {
  cap: 'value:font-relative-unit',
  ch: 'value:font-relative-unit',
  cqb: 'value:container-unit',
  cqh: 'value:container-unit',
  cqi: 'value:container-unit',
  cqmax: 'value:container-unit',
  cqmin: 'value:container-unit',
  cqw: 'value:container-unit',
  dvb: 'value:viewport-unit',
  dvh: 'value:viewport-unit',
  dvi: 'value:viewport-unit',
  dvw: 'value:viewport-unit',
  ex: 'value:font-relative-unit',
  ic: 'value:font-relative-unit',
  lh: 'value:font-relative-unit',
  lvh: 'value:viewport-unit',
  rlh: 'value:font-relative-unit',
  svh: 'value:viewport-unit',
  vb: 'value:viewport-unit',
  vh: 'value:viewport-unit',
  vi: 'value:viewport-unit',
  vmax: 'value:viewport-unit',
  vmin: 'value:viewport-unit',
  vw: 'value:viewport-unit',
}

/** Keywords that have no typed form, or that only the web has. */
const KEYWORDS: Readonly<Record<string, (text: string) => Finding>> = {
  inherit: (text) => missing('value:css-wide-keyword', text),
  initial: (text) => missing('value:css-wide-keyword', text),
  revert: (text) => missing('value:css-wide-keyword', text),
  'revert-layer': (text) => missing('value:css-wide-keyword', text),
  'step-end': (text) => missing('value:steps-easing', text),
  'step-start': (text) => missing('value:steps-easing', text),
  unset: (text) => missing('value:css-wide-keyword', text),
}

/** The system colors forced-colors mode paints with. */
const SYSTEM_COLORS: ReadonlySet<string> = new Set([
  'accentcolor',
  'accentcolortext',
  'activetext',
  'buttonborder',
  'buttonface',
  'buttontext',
  'canvas',
  'canvastext',
  'field',
  'fieldtext',
  'graytext',
  'highlight',
  'highlighttext',
  'linktext',
  'mark',
  'marktext',
  'selecteditem',
  'selecteditemtext',
  'visitedtext',
])

/** Functions the language lacks, grouped by the addition that would cover them. */
const FUNCTION_GROUPS: Readonly<Record<string, string>> = {
  blur: 'value:filter-function',
  brightness: 'value:filter-function',
  circle: 'value:shape',
  color: 'value:color-function',
  'conic-gradient': 'value:gradient-kind',
  contrast: 'value:filter-function',
  'drop-shadow': 'value:filter-function',
  ellipse: 'value:shape',
  grayscale: 'value:filter-function',
  hsl: 'value:color-function',
  hsla: 'value:color-function',
  'hue-rotate': 'value:filter-function',
  hwb: 'value:color-function',
  inset: 'value:shape',
  invert: 'value:filter-function',
  lab: 'value:color-function',
  lch: 'value:color-function',
  'light-dark': 'value:light-dark',
  linear: 'value:linear-easing',
  matrix: 'value:transform-3d',
  matrix3d: 'value:transform-3d',
  oklab: 'value:color-function',
  oklch: 'value:color-function',
  path: 'value:shape',
  perspective: 'value:transform-3d',
  polygon: 'value:shape',
  'radial-gradient': 'value:gradient-kind',
  'repeating-conic-gradient': 'value:gradient-kind',
  'repeating-linear-gradient': 'value:gradient-kind',
  'repeating-radial-gradient': 'value:gradient-kind',
  rgb: 'value:color-function',
  rgba: 'value:color-function',
  rotate3d: 'value:transform-3d',
  rotateX: 'value:transform-3d',
  rotateY: 'value:transform-3d',
  saturate: 'value:filter-function',
  scale3d: 'value:transform-3d',
  scaleZ: 'value:transform-3d',
  scroll: 'value:scroll-timeline',
  sepia: 'value:filter-function',
  skew: 'value:transform-3d',
  skewX: 'value:transform-3d',
  skewY: 'value:transform-3d',
  steps: 'value:steps-easing',
  translate3d: 'value:transform-3d',
  translateZ: 'value:transform-3d',
  view: 'value:scroll-timeline',
}

/** Functions only generated content reads. */
const WEB_FUNCTIONS: ReadonlySet<string> = new Set(['attr', 'counter', 'counters'])

/** Classifies each part of a value, in order. */
export const valueFindings = (nodes: readonly ValueNode[], context: ValueContext): Finding[] =>
  nodes.flatMap((node) => nodeFindings(node, context))

/** What a `var()` names: a token, an own value, a hook, or another reference. */
export const referenceKind = (name: string, context: ValueContext): string => {
  if (name.startsWith('--helix-')) {
    return 'value:token'
  }
  if (name.startsWith('--_')) {
    return 'value:own'
  }
  return context.hookPrefix !== '' && name.startsWith(context.hookPrefix)
    ? 'value:hook'
    : 'value:reference'
}

/** `var(--name, fallback)`: a reference, and its fallback typed as any value. */
const varFindings = (call: FunctionNode, context: ValueContext): Finding[] => {
  const [name, , ...fallback] = call.children
  const kind = referenceKind(name?.type === 'Identifier' ? name.name : '', context)
  return [named(kind, print(call)), ...valueFindings(fallback, context)]
}

/** A `/` in `calc()` whose divisor is not a number, which `product` cannot write. */
const divisionFindings = (nodes: readonly ValueNode[]): Finding[] =>
  nodes.flatMap((node, index) => {
    if (node.type === 'Parentheses') {
      return divisionFindings(node.children)
    }
    if (node.type !== 'Operator' || node.value.trim() !== '/') {
      return []
    }
    const divisor = nodes[index + 1]
    return divisor === undefined || divisor.type === 'Number'
      ? []
      : [missing('value:calc-division', `/ ${print(divisor)}`)]
  })

/** `calc()`: a sum, a difference, or a product, and a division by a number. */
const calcFindings = (call: FunctionNode, context: ValueContext): Finding[] => [
  named('value:calc', print(call)),
  ...valueFindings(call.children, context),
  ...divisionFindings(call.children),
]

/** `color-mix()`: a mix in OKLab, and only in OKLab. */
const mixFindings = (call: FunctionNode, context: ValueContext): Finding[] => {
  const [method, space] = call.children
  const isOklab =
    method?.type === 'Identifier' &&
    method.name === 'in' &&
    space?.type === 'Identifier' &&
    space.name === 'oklab'
  return [
    isOklab ? named('value:mix', print(call)) : missing('value:color-space', print(call)),
    ...valueFindings(call.children.slice(2), context),
  ]
}

/** A function the language names, reported as its construct, with its arguments read. */
const constructWith =
  (construct: string) =>
  (call: FunctionNode, context: ValueContext): Finding[] => [
    named(construct, print(call)),
    ...valueFindings(call.children, context),
  ]

/** Functions the language names, each with its handler. */
const FUNCTIONS: Readonly<
  Record<string, (call: FunctionNode, context: ValueContext) => Finding[]>
> = {
  calc: calcFindings,
  clamp: constructWith('value:min-max-clamp'),
  'color-mix': mixFindings,
  'cubic-bezier': constructWith('value:bezier'),
  'fit-content': constructWith('value:tracks'),
  'linear-gradient': constructWith('value:linear-gradient'),
  max: constructWith('value:min-max-clamp'),
  min: constructWith('value:min-max-clamp'),
  minmax: constructWith('value:tracks'),
  repeat: constructWith('value:tracks'),
  rotate: constructWith('value:transform'),
  rotateZ: constructWith('value:transform'),
  scale: constructWith('value:transform'),
  scaleX: constructWith('value:transform'),
  scaleY: constructWith('value:transform'),
  translate: constructWith('value:transform'),
  translateX: constructWith('value:transform'),
  translateY: constructWith('value:transform'),
  var: varFindings,
}

const functionFindings = (call: FunctionNode, context: ValueContext): Finding[] => {
  const handler = FUNCTIONS[call.name]
  if (handler !== undefined) {
    return handler(call, context)
  }
  const text = print(call)
  if (WEB_FUNCTIONS.has(call.name)) {
    return [webOnly('web:generated-content', text)]
  }
  return [missing(functionGroup(call), text), ...valueFindings(call.children, context)]
}

/** The group of a function the language lacks. `oklch(from ...)` is a relative color. */
const functionGroup = (call: FunctionNode): string => {
  const group = FUNCTION_GROUPS[call.name] ?? `value:function-${call.name}`
  const [first] = call.children
  const relative = first?.type === 'Identifier' && first.name === 'from'
  return group === 'value:color-function' && relative ? 'value:relative-color' : group
}

const unitFindings = (unit: string, text: string): Finding[] => {
  const lower = unit.toLowerCase()
  if (UNITS.has(lower)) {
    return []
  }
  return [missing(UNIT_GROUPS[lower] ?? `value:unit-${lower}`, text)]
}

const identifierFindings = (identifier: Identifier): Finding[] => {
  const lower = identifier.name.toLowerCase()
  if (SYSTEM_COLORS.has(lower)) {
    return [webOnly('web:system-color', identifier.name)]
  }
  const keyword = KEYWORDS[lower]
  return keyword === undefined ? [] : [keyword(identifier.name)]
}

const nodeFindings = (node: ValueNode, context: ValueContext): Finding[] => {
  switch (node.type) {
    case 'Dimension':
      return unitFindings(node.unit, print(node))
    case 'Function':
      return functionFindings(node, context)
    case 'Identifier':
      return identifierFindings(node)
    case 'Parentheses':
    case 'Value':
      return valueFindings(node.children, context)
    case 'Raw':
      return node.value.trim() === '' ? [] : [missing('value:unparsed', node.value.trim())]
    case 'Url':
      return [missing('value:url', print(node))]
    default:
      return []
  }
}
