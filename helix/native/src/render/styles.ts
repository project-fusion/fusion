import type { ReactNode } from 'react'
import { I18nManager } from 'react-native'
import type { Context } from '../style/context'
import type { Family, Node } from '../style/form'
import type { Line, Resolved, Slotted, Style } from '../style/resolved'
import { style } from '../style/style'
import { stepsOf, withoutTransform } from '../style/transforms'
import type { Theme } from '../theme/theme'
import { type Behavior, boundBy, type Props, viewFor } from './behavior'
import { carried } from './carried'
import { colorModeOf } from './color-mode'
import { computedAttribute, derivedFor, holdsContent, laidOr } from './computed'
import { type Entry, ofCopy } from './entry'
import { UNFOLDED } from './fold'
import type { Scrolling } from './scrolled'
import { totalHolds } from './total'

export { inherit, pageText } from './inheritance'
export type { Fill, Scrolling } from './scrolled'

/** What a part's values are read from. */
export interface Values {
  /** What the element's machines give its parts. */
  readonly behavior: Behavior
  readonly family: Family
  /** The entry of the repeat's copy being drawn, which `field()` and `index()` read. */
  readonly item?: Entry
  /** Whether the element's lazy content has been drawn, which its `loaded` state reads. */
  readonly loaded: boolean
  /** Its words' locale where its `locale` names none: the nearest `lang`, or the reader's. */
  readonly locale?: string
  /** The style the element around gives each part, where a box of it draws this one. */
  readonly parts?: Readonly<Record<string, Style>> | undefined
  /** The element's props, by React's names. */
  readonly props: Props
}

/** What a part's style is resolved under. */
export interface Styling extends Values {
  /** The context every part of the element is drawn under. */
  readonly base: Context
}

/** Whether an element's lazy content has been drawn, and how a region marks it as drawn. */
export interface Lazy {
  /** Marks lazy content as drawn at this render, so it stays drawn from the next. */
  readonly due: () => void
  readonly loaded: boolean
}

/** What drawing one element's tree reads, at one render. */
export interface Scope extends Styling {
  /** The host's style, whose counter resets its region content counts from. */
  readonly host: Resolved
  readonly lazy: Lazy
  /**
   * Where the node being drawn stands among the copies a `repeat` draws, which
   * its rules read as `:first-child` and `:last-child` in place of its place
   * in the tree. Absent outside a repeat, and for what a copy holds.
   */
  readonly copy?: {
    readonly child: 'first' | 'later'
    readonly fromEnd?: number
    readonly index?: number
    readonly last: boolean
  }
  /** The scrolling part around the nodes being drawn, where there is one. */
  readonly scrolling?: Scrolling
  readonly theme: Theme
  /** The tracks the element shares among the elements passed into it, which a subgrid lines up in. */
  readonly tracks?: import('./tracks').Tracks
}

/** Draws one node of the tree, with the text it inherits, its region style, and the part it is in. */
export type Draw = (
  scope: Scope,
  node: Node,
  text: Style,
  regions: Style,
  inside: Node | 'host',
) => ReactNode

/** `pending-label` as React spells a prop, `pendingLabel`. */
export const camel = (name: string): string =>
  name.replace(/-(\w)/g, (_, letter: string) => letter.toUpperCase())

/**
 * A prop as the element was given it, or its default where it was not. The
 * default region is `children`, which a node reads as `default` where it asks
 * whether the region holds something.
 */
export const given = (values: Pick<Values, 'family' | 'props'>, name: string): unknown => {
  const set =
    name === 'default'
      ? ((values.props as Record<symbol, unknown>)[UNFOLDED] ?? values.props.children)
      : values.props[camel(name)]
  return set === undefined
    ? values.family.api?.props.find((prop) => prop.name === name)?.default
    : set
}

/**
 * A value a part reads by name: a list or a state its binding gives it, then
 * one the host's binding gives every part, then a mark, then a value the element
 * computes, then the element's prop. `loaded`, where nothing above gives it,
 * is whether the element's lazy content has been drawn.
 *
 * **A computed value that binds a region is whether it holds something**, as
 * a badge's `has-icon` is.
 */
export const read = (values: Values, name: string, part = 'host'): unknown => {
  const { marks } = values.behavior
  const stated = boundBy(values.behavior, part, name)
  if (stated !== undefined) {
    return stated
  }
  if (marks.includes(name)) {
    return true
  }
  const computed = computedAttribute(values.family, name)
  if (computed !== undefined) {
    return 'bind' in computed
      ? holdsContent(read(values, computed.bind, part))
      : bound(values, computed, part)
  }
  const loaded = name === 'loaded' ? values.loaded : given(values, name)
  return totalHolds(values.family, values.props, name) ?? loaded
}

/**
 * The string a prop's value picks, as a toggle group's role. **A flag picks
 * by `true` or `false`**, as a current step is `step`.
 */
const picked = (
  values: Values,
  attribute: { readonly otherwise: unknown; readonly pick: unknown; readonly values: unknown },
  part: string | undefined,
): unknown => {
  const by = attribute.values as Readonly<Record<string, string>>
  const raw = read(values, String(attribute.pick), part)
  const held = typeof raw === 'boolean' ? String(raw) : raw
  return typeof held === 'string' && held in by ? by[held] : attribute.otherwise
}

/**
 * An attribute's value on the part `part`: what a `bind` reads, a copy's
 * field or place, the opposite of what a `not` reads, the string a `pick`
 * takes for the value it reads, or the attribute as written.
 */
export const bound = (values: Values, attribute: unknown, part?: string): unknown => {
  if (typeof attribute !== 'object' || attribute === null) {
    return attribute
  }
  if ('bind' in attribute) {
    return read(values, String(attribute.bind), part)
  }
  if ('field' in attribute || 'index' in attribute) {
    return ofCopy(values.item, attribute)
  }
  if ('not' in attribute) {
    return !read(values, String(attribute.not), part)
  }
  if ('pick' in attribute && 'values' in attribute && 'otherwise' in attribute) {
    return picked(values, attribute, part)
  }
  /* What core's derivation computes from the props, as a key's chord. */
  if ('derive' in attribute) {
    return derivedFor(values, String(attribute.derive), (name) =>
      name === 'now' ? read(values, 'now') : laidOr(values, name, given(values, name)),
    )
  }
  return attribute
}

/** A value as a condition reads it: a flag or words, and nothing else. */
const conditionOf = (value: unknown): boolean | string | undefined =>
  typeof value === 'boolean' || typeof value === 'string' ? value : undefined

/**
 * What holds for every part: each prop's value, each state, and each mark,
 * with the states the host's binding gives over them. **A number is the words
 * of its attribute**, as an icon's `rotate={90}` matches `[rotate="90"]`.
 */
export const conditionsOf = (values: Values): Record<string, boolean | string | undefined> => {
  const conditions: Record<string, boolean | string | undefined> = {}
  const api = values.family.api
  for (const prop of api?.props ?? []) {
    const set = read(values, prop.name)
    conditions[prop.name] = conditionOf(typeof set === 'number' ? String(set) : set)
  }
  for (const state of api?.states ?? []) {
    conditions[state] = Boolean(read(values, state))
  }
  /* What the element computes, which a `when()` and a native rule read. */
  for (const name of [...Object.keys(api?.derived ?? {}), ...[api?.total?.holds ?? []].flat()]) {
    conditions[name] = conditionOf(read(values, name))
  }
  for (const mark of values.behavior.marks) {
    conditions[mark] = true
  }
  /* And the color mode the page names on any element, which a rule reads as present. */
  return { ...conditions, ...colorModeOf(values.props), ...values.behavior.parts.host?.states }
}

/** The part's state its attributes hold by name, such as `hidden`, and `href` while it goes somewhere. */
const flags = (values: Values, node: Node): Record<string, boolean | string> => {
  const part: Record<string, boolean | string> = {}
  for (const [key, attribute] of Object.entries(node.attributes ?? {})) {
    const bare = bound(values, attribute, node.name)
    const set = key === 'href' ? typeof bare === 'string' && bare !== '' : bare
    if (typeof set === 'boolean') {
      part[key] = set
    } else if (key.startsWith('data-') && typeof set === 'string' && set !== '') {
      /* A `data-` attribute's words, which a rule's `part` condition reads, `data-band="good"`. */
      part[key] = set
    }
  }
  return part
}

/** The parts a node is as well while each flag holds, as a row is `row-current` while it is current. */
const also = (values: Values, node: Node): string[] => {
  const parts = node.attributes?.also
  if (typeof parts !== 'object' || parts === null || 'bind' in parts || 'not' in parts) {
    return []
  }
  return Object.entries(parts)
    .filter(([, flag]) => Boolean(bound(values, flag, node.name)))
    .map(([name]) => name)
}

/**
 * A part's style. `node` is a node of the tree, or the name of a part that
 * holds no attributes, such as `host` or a region's part.
 *
 * **A part's own state is what its attributes hold, `state` from the drawing,
 * and the states its binding gives it.** The binding's states are conditions
 * of the part as well, so a rule reads a pressed look as it reads `:active`
 * on the web.
 */
export const resolve = (
  styling: Styling,
  node: Node | string,
  extra: Partial<Context> = {},
  state: Readonly<Record<string, boolean>> = {},
): Resolved => {
  const name = typeof node === 'string' ? node : node.name
  const states = styling.behavior.parts[name]?.states ?? {}
  const own = typeof node === 'string' ? {} : flags(styling, node)
  const measured =
    typeof node === 'string'
      ? {}
      : carried(node, (attribute) => bound(styling, attribute, node.name))
  const resolved = style(styling.family, name, {
    ...styling.base,
    ...extra,
    ...(Object.keys(measured).length === 0
      ? {}
      : { measured: { ...styling.base.measured, ...extra.measured, ...measured } }),
    also: typeof node === 'string' ? [] : also(styling, node),
    conditions: { ...styling.base.conditions, ...states },
    part: { ...own, ...state, ...states },
  })
  /* The element around styles a part of this one where its box draws it. */
  const given = styling.parts?.[name]
  return given === undefined ? resolved : { ...resolved, style: { ...resolved.style, ...given } }
}

/**
 * A part's view props with its binding laid over them. **A binding's style is
 * drawn over the part's own**, and anything else it gives replaces what the
 * tree gives. A copy of a repeat, `item`, takes its own view over it too.
 */
export const laid = (
  behavior: Behavior,
  part: string,
  own: Readonly<Record<string, unknown>>,
  item?: Entry,
): Readonly<Record<string, unknown>> => {
  const view = viewFor(behavior.parts[part], item)
  const style = view?.style === undefined ? {} : { style: [own.style, view.style] }
  return view === undefined ? own : { ...own, ...view, ...style }
}

/**
 * The text properties a view does not take, which its text does. **A line
 * limit and a line breaking are props of a text**, which `ScaledText` takes
 * out of its style, and they inherit with the rest, as `white-space` and
 * `text-wrap` do.
 */
const TEXT = new Set([
  'color',
  'ellipsizeMode',
  'fontFamily',
  'fontSize',
  'fontStyle',
  'fontVariant',
  'fontWeight',
  'letterSpacing',
  'lineBreakStrategyIOS',
  'lineHeight',
  'numberOfLines',
  'textAlign',
  'textBreakStrategy',
  'textDecorationLine',
  'textTransform',
])

/** The paint of a shape, which a view does not take. */
export const PAINT = new Set([
  'cx',
  'cy',
  'fill',
  'fillOpacity',
  'r',
  'stroke',
  'strokeDasharray',
  'strokeDashoffset',
  'strokeLinecap',
  'strokeLinejoin',
  'strokeOpacity',
  'strokeWidth',
])

/** A part's style as what its view takes and what its text takes. A shape's paint, `paintOf` reads. */
export const split = (resolved: Style): readonly [box: Style, text: Style] => {
  const box: Record<string, number | string> = {}
  const text: Record<string, number | string> = {}
  for (const [key, value] of Object.entries(resolved)) {
    if (TEXT.has(key)) {
      text[key] = value
    } else if (!PAINT.has(key)) {
      box[key] = value
    }
  }
  return [box, text]
}

/** A part's paint: its fill and its stroke, and a circle's center and radius. */
export const paintOf = (resolved: Style): Style =>
  Object.fromEntries(Object.entries(resolved).filter(([key]) => PAINT.has(key)))

/**
 * A style with its translate, rotation, scale, and transform list written as
 * the transform a view takes.
 */
export const transformed = (drawn: Style): Readonly<Record<string, unknown>> => {
  const steps = stepsOf(drawn)
  const rest = withoutTransform(drawn)
  return steps.length === 0 ? rest : { ...rest, transform: steps }
}

/**
 * What a part takes from the text it is drawn in: the color its
 * `currentColor` means, and the font size an em in it means where it sets
 * none of its own.
 */
export const fromText = (text: Style): Partial<Context> => ({
  ...(typeof text.color === 'string' ? { currentColor: text.color } : {}),
  ...(typeof text.fontSize === 'number' ? { fontSize: text.fontSize } : {}),
})

/**
 * **A custom property the element around sets on this one is one of its
 * hooks**, as a list's rows read `--list-item-rail-display`.
 */
export const hooksOf = (
  family: Family,
  slotted: Slotted | undefined,
): Record<string, number | string> => {
  const hooks: Record<string, number | string> = {}
  const prefix = `${family.name}-`
  for (const [name, said] of Object.entries(slotted?.custom ?? {})) {
    if (name.startsWith(prefix) && (typeof said === 'string' || typeof said === 'number')) {
      hooks[name.slice(prefix.length)] = said
    }
  }
  return hooks
}

/** The text direction the app is laid out in. */
export const direction = (): 'ltr' | 'rtl' => (I18nManager.isRTL ? 'rtl' : 'ltr')

/**
 * A line along a part's edge, on the edge a view draws it on. **A background's
 * edge is physical, and React Native swaps `left` and `right` right to left**
 * unless an app turns that off, so a line on the physical left is written on
 * the right there.
 */
export const physical = (line: Line | undefined): Line | undefined => {
  if (line === undefined || (line.edge !== 'left' && line.edge !== 'right')) {
    return line
  }
  const swaps = I18nManager.isRTL && I18nManager.doLeftAndRightSwapInRTL !== false
  return swaps ? { ...line, edge: line.edge === 'left' ? 'right' : 'left' } : line
}
