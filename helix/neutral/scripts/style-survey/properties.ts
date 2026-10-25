/**
 * The grammar's property allowlist, the web-only properties, and the groups
 * the report sorts every other property into.
 *
 * **A property not named here is "not in the grammar"**, reported under its
 * own name. The groups exist so the report ranks a gap by what it would take
 * to close: `stroke` and `fill` are one addition to the language.
 */

/** Properties the grammar allows, each with the construct it maps to. */
const GRAMMAR: Readonly<Record<string, string>> = {
  'align-content': 'set:flex',
  'align-items': 'set:flex',
  'align-self': 'set:flex',
  'aspect-ratio': 'set:box',
  'background-color': 'set:color',
  'background-image': 'set:background-image',
  'box-shadow': 'set:shadow',
  'box-sizing': 'set:box',
  color: 'set:color',
  'column-gap': 'set:flex',
  display: 'set:box',
  flex: 'set:flex',
  'flex-basis': 'set:flex',
  'flex-direction': 'set:flex',
  'flex-flow': 'set:flex',
  'flex-grow': 'set:flex',
  'flex-shrink': 'set:flex',
  'flex-wrap': 'set:flex',
  'font-family': 'set:text',
  'font-size': 'set:text',
  'font-variant-numeric': 'set:text',
  'font-weight': 'set:text',
  gap: 'set:flex',
  'grid-auto-columns': 'set:columns',
  'grid-auto-rows': 'set:columns',
  'grid-template-columns': 'set:columns',
  'grid-template-rows': 'set:columns',
  'justify-content': 'set:flex',
  'justify-items': 'set:flex',
  'justify-self': 'set:flex',
  'letter-spacing': 'set:text',
  'line-height': 'set:text',
  opacity: 'set:box',
  overflow: 'set:box',
  'overflow-x': 'set:box',
  'overflow-y': 'set:box',
  'place-content': 'set:flex',
  'place-items': 'set:flex',
  'place-self': 'set:flex',
  'pointer-events': 'set:interaction',
  position: 'set:position',
  rotate: 'set:transform',
  'row-gap': 'set:flex',
  scale: 'set:transform',
  'text-align': 'set:text',
  'text-decoration': 'set:text',
  'text-decoration-color': 'set:text',
  'text-decoration-line': 'set:text',
  'text-decoration-style': 'set:text',
  'text-decoration-thickness': 'set:text',
  'text-overflow': 'set:text',
  'text-transform': 'set:text',
  'text-underline-offset': 'set:text',
  transform: 'set:transform',
  'transform-origin': 'set:transform',
  translate: 'set:transform',
  'user-select': 'set:interaction',
  'white-space': 'set:text',
  'z-index': 'set:box',
}

/** Logical sizes. Physical `width` and `height` are reported apart. */
const SIZES: ReadonlySet<string> = new Set([
  'block-size',
  'inline-size',
  'max-block-size',
  'max-inline-size',
  'min-block-size',
  'min-inline-size',
])

/** Properties the web keeps as named constructs, each with its construct. */
const WEB_PROPERTIES: Readonly<Record<string, string>> = {
  appearance: 'web:appearance',
  content: 'web:generated-content',
  'counter-increment': 'web:counters',
  'counter-reset': 'web:counters',
  'counter-set': 'web:counters',
  cursor: 'web:cursor',
  'forced-color-adjust': 'web:forced-color-adjust',
  'grid-template-areas': 'web:template-areas',
  'print-color-adjust': 'web:print-color-adjust',
  'touch-action': 'web:touch-action',
}

/** Properties outside the grammar, grouped by the addition that would cover them. */
const GROUPS: Readonly<Record<string, string>> = {
  all: 'property:all',
  'backdrop-filter': 'property:filter',
  background: 'property:background-layers',
  'background-attachment': 'property:background-layers',
  'background-clip': 'property:background-layers',
  'background-origin': 'property:background-layers',
  'background-position': 'property:background-layers',
  'background-repeat': 'property:background-layers',
  'background-size': 'property:background-layers',
  bottom: 'property:physical-inset',
  'box-decoration-break': 'property:fragmentation',
  'break-inside': 'property:fragmentation',
  'clip-path': 'property:clip-and-mask',
  container: 'property:container',
  'container-name': 'property:container',
  'container-type': 'property:container',
  cx: 'property:svg-geometry',
  cy: 'property:svg-geometry',
  d: 'property:svg-geometry',
  filter: 'property:filter',
  font: 'property:font-shorthand',
  'font-feature-settings': 'property:font-features',
  'font-style': 'property:font-features',
  'font-variant-caps': 'property:font-features',
  'font-variant-ligatures': 'property:font-features',
  'grid-area': 'property:grid-placement',
  'grid-auto-flow': 'property:grid-placement',
  'grid-column': 'property:grid-placement',
  'grid-column-end': 'property:grid-placement',
  'grid-column-start': 'property:grid-placement',
  'grid-row': 'property:grid-placement',
  'grid-row-end': 'property:grid-placement',
  'grid-row-start': 'property:grid-placement',
  height: 'property:physical-size',
  hyphens: 'property:text-wrapping',
  left: 'property:physical-inset',
  'max-height': 'property:physical-size',
  'max-width': 'property:physical-size',
  'min-height': 'property:physical-size',
  'min-width': 'property:physical-size',
  'object-fit': 'property:object-fit',
  'object-position': 'property:object-fit',
  'overflow-wrap': 'property:text-wrapping',
  'paint-order': 'property:svg-paint',
  r: 'property:svg-geometry',
  right: 'property:physical-inset',
  rx: 'property:svg-geometry',
  ry: 'property:svg-geometry',
  'text-wrap': 'property:text-wrapping',
  top: 'property:physical-inset',
  'transform-box': 'property:svg-geometry',
  'vector-effect': 'property:svg-paint',
  width: 'property:physical-size',
  'word-break': 'property:text-wrapping',
  x: 'property:svg-geometry',
  y: 'property:svg-geometry',
}

/** Families of properties by prefix, each with what the family is. */
const PREFIXES: readonly (readonly [prefix: string, construct: string])[] = [
  ['-moz-', 'property:vendor'],
  ['-webkit-', 'property:vendor'],
  ['animation', 'set:animation'],
  ['border', 'set:border'],
  ['fill', 'property:svg-paint'],
  ['inset', 'set:inset'],
  ['margin', 'set:spacing'],
  ['mask', 'property:clip-and-mask'],
  ['outline', 'set:outline'],
  ['overscroll-behavior', 'property:overscroll'],
  ['padding', 'set:spacing'],
  ['scroll-margin', 'property:scroll-spacing'],
  ['scroll-padding', 'property:scroll-spacing'],
  ['scroll-snap', 'web:scroll-snap'],
  ['scrollbar', 'web:scrollbar'],
  ['stop-', 'property:svg-paint'],
  ['stroke', 'property:svg-paint'],
  ['transition', 'set:transition'],
]

/**
 * What a property is to the language: a `set:` construct, a `web:` one, or a
 * `property:` reason it is not in the grammar.
 */
export const propertyConstruct = (property: string): string => {
  const exact = GRAMMAR[property] ?? WEB_PROPERTIES[property] ?? GROUPS[property]
  if (exact !== undefined) {
    return exact
  }
  if (SIZES.has(property)) {
    return 'set:size'
  }
  const family = PREFIXES.find(([prefix]) => property.startsWith(prefix))
  return family === undefined ? `property:${property}` : family[1]
}

/** What transitions, keyframes, and `@starting-style` may animate on every platform. */
export const ANIMATABLE: ReadonlySet<string> = new Set([
  'background-color',
  'block-size',
  'border-block-color',
  'border-block-end-color',
  'border-block-start-color',
  'border-bottom-color',
  'border-color',
  'border-inline-color',
  'border-inline-end-color',
  'border-inline-start-color',
  'border-left-color',
  'border-right-color',
  'border-top-color',
  'color',
  'height',
  'inline-size',
  'max-block-size',
  'max-inline-size',
  'min-block-size',
  'min-inline-size',
  'opacity',
  'rotate',
  'scale',
  'transform',
  'translate',
  'width',
])

/** What the web may also animate, as a discrete step: entry and exit of a box. */
export const DISCRETE: ReadonlySet<string> = new Set(['display', 'overlay', 'visibility'])
