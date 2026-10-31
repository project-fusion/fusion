/* `@fusion.dev/helix/jsx-runtime` on React Native: the JSX runtime for code
   written once for the web and a phone. Set `jsxImportSource` to
   `@fusion.dev/helix`, or have the bundler give this module for
   `react/jsx-runtime`, and each tag draws on a phone:
   - a `helix-*` tag is the native component of that name, with its
     attributes as props, `selection-mode` as `selectionMode`;
   - a child with a `slot` becomes the region prop it names, as `start` or
     `panels`, and a `span` there gives its words, or draws them in a region
     that names the element, as a meter's `label`;
   - an `onhelix-*` handler hears the native event, which has the web's
     shape: its fields under `detail`, and the value of the element that sent
     it under `target`. `onClick` is `onPress`;
   - a custom property in a `style` that names one of the element's hooks,
     `--qr-code-size` on `helix-qr-code`, sets that hook;
   - a size in a `style`, `blockSize` or `height` and the rest, sizes the
     element;
   - `data-grid-span` stays on the child, where the native Grid reads it,
     and `data-density` on any element or box, which draws what it holds at
     that density, and `data-color-mode`, `light` or `dark`, which draws it
     and what it holds in that mode's tokens;
   - a `section` with an `id` registers itself for Outline, named by the
     words and the `data-level` of the link to it, and any other element
     with an `id` registers its view under it, so a tour stop's `for` and
     an app header's `scroller` find it as the web finds an element;
   - a `fieldset` with `disabled` disables the form controls inside it, as
     `:disabled` reaches them on the web;
   - a raw `svg` and the shapes it holds draw through `react-native-svg`;
   - a tag a phone has no component for says so where it would be, and a
     development build warns about it once, as `helix shared` reports it
     from the code.

   On the web, `src/jsx-runtime/jsx-runtime.ts` is React's own runtime, since
   the web draws the elements themselves, so one `jsxImportSource` serves
   both platforms. The `JSX` namespace is React's on both. */
import { HelixTheme, hookPrefix, regionNames, warnWebTag } from '@fusion.dev/helix-native'
import * as React from 'react'
import { hasComponent, TAGS } from './tags.native'
import { Box, camel, Missing, noteFragment, type Props, Section, Span } from './words.native'

export type { JSX } from 'react/jsx-runtime'
export { hasComponent }

/** Attributes only a browser reads. */
const WEB = new Set(['class', 'className', 'id', 'style'])

/**
 * `data-` attributes a native component reads, as a grid reads a cell's
 * span, any element its density, and a rule whether a color mode is named.
 */
const READ = new Set(['data-color-mode', 'data-density', 'data-grid-span'])

/** An attribute as the native prop of the same meaning. */
const propOf = (name: string, value: unknown, out: Record<string, unknown>): void => {
  if (READ.has(name)) {
    out[name] = value
    return
  }
  if (name === 'children' || WEB.has(name) || name.startsWith('data-')) {
    return
  }
  if (name.startsWith('onhelix-') && typeof value === 'function') {
    out[camel(`on-${name.slice('onhelix-'.length)}`)] = value
  } else if (name === 'onClick') {
    out.onPress = value
  } else {
    out[camel(name)] = value
  }
}

/**
 * Whether a slotted child gives the region its words alone: a `span`, or a
 * `helix-text` with nothing set but its slot, which the web draws as a `span`
 * would be drawn.
 */
const wordsOnly = (element: React.ReactElement<Props>): boolean =>
  element.type === Span ||
  (element.type === TAGS['helix-text'] &&
    Object.keys(element.props).every((name) => name === 'slot' || name === 'children'))

/** Words written in pieces, as `{name} is late`, as the one string the web shows. */
const joined = (children: React.ReactNode): React.ReactNode =>
  Array.isArray(children) &&
  children.every((child) => typeof child === 'string' || typeof child === 'number')
    ? children.join('')
    : children

/* **A slotted child is the region prop it names.** Words alone are the
   region's words, except in a region that names the element, as a meter's
   `label`: there words are its name and draw nothing, so the words a web
   page slots in, which the web draws, stay a `span`. */
const regionsOf = (tag: string, children: React.ReactNode, out: Record<string, unknown>) => {
  const lifted: Record<string, unknown[]> = {}
  const rest: React.ReactNode[] = []
  for (const child of React.Children.toArray(children)) {
    const slot = React.isValidElement(child) ? (child.props as { slot?: unknown }).slot : undefined
    /* A region named `children` stands among `children`, which no prop can name apart. */
    if (typeof slot !== 'string' || slot === '' || slot === 'children') {
      rest.push(child)
      continue
    }
    const element = child as React.ReactElement<Props>
    const value = !wordsOnly(element)
      ? element
      : regionNames(tag, slot)
        ? React.createElement(Span, null, joined(element.props.children))
        : joined(element.props.children)
    lifted[camel(slot)] ??= []
    lifted[camel(slot)]?.push(value)
  }
  for (const [name, values] of Object.entries(lifted)) {
    out[name] = name === 'panels' || values.length > 1 ? values : values[0]
  }
  if (rest.length > 0) {
    out.children = rest.length === 1 ? rest[0] : rest
  }
}

/* **A custom property in a `style` that names one of the element's hooks
   sets that hook**, as an inline style sets it on the web:
   `style={{ '--qr-code-size': '8rem' }}` on `helix-qr-code` is
   `hooks={{ size: '8rem' }}`. The rest of a `style` is the web's. */
const styledHooks = (tag: string, style: unknown): Record<string, unknown> | undefined => {
  const prefix = hookPrefix(tag)
  if (prefix === undefined || typeof style !== 'object' || style === null) {
    return undefined
  }
  const lead = `--${prefix}-`
  const found: Record<string, unknown> = {}
  for (const [name, value] of Object.entries(style)) {
    if (name.startsWith(lead) && (typeof value === 'string' || typeof value === 'number')) {
      found[camel(name.slice(lead.length))] = value
    }
  }
  return Object.keys(found).length > 0 ? found : undefined
}

const translate = (type: unknown, props: Props): readonly [unknown, Props] => {
  if (typeof type !== 'string') {
    return [type, props]
  }
  if (type === 'a') {
    noteFragment(props)
  }
  if (type === 'section' && typeof props.id === 'string') {
    return [Section, { children: props.children, sectionId: props.id }]
  }
  const target = TAGS[type] ?? (type.startsWith('helix-') ? Missing : Box)
  const out: Record<string, unknown> = target === Missing ? { tag: type } : {}
  for (const [name, value] of Object.entries(props)) {
    propOf(name, value, out)
  }
  /* The view registers under its id, which the web finds the element by. */
  if (typeof props.id === 'string' && target !== Missing) {
    out.id = props.id
  }
  /* The sizes a `style` writes, which the element reads off it. */
  if (typeof type === 'string' && type.startsWith('helix-') && props.style !== undefined) {
    out.style = props.style
  }
  const hooks = styledHooks(type, props.style)
  if (hooks !== undefined) {
    out.hooks = { ...hooks, ...(out.hooks as Record<string, unknown> | undefined) }
  }
  regionsOf(type, props.children, out)
  return [target, out]
}

export const Fragment = React.Fragment

/** The mode `data-color-mode` draws an element in, as it sets one on the web. */
const modeOf = (props: Props): 'dark' | 'light' | undefined => {
  const mode = props['data-color-mode']
  return mode === 'dark' || mode === 'light' ? mode : undefined
}

/* **Children written out in the source are static**, as React's own runtime
   has them: passed one by one, so they need no keys. Children an example
   maps over arrive as one array, which keys its items. */
const make = (
  type: unknown,
  props: Props,
  key: React.Key | undefined,
  written: boolean,
): React.ReactElement => {
  const [target, translated] = translate(type, props)
  const { children, ...rest } = translated as Props
  const mode = typeof type === 'string' ? modeOf(props) : undefined
  const given = key === undefined || mode !== undefined ? rest : { ...rest, key }
  const drawn =
    written && Array.isArray(children)
      ? React.createElement(target as React.ElementType, given, ...children)
      : React.createElement(
          target as React.ElementType,
          children === undefined ? given : { ...given, children },
        )
  /* **`data-color-mode` draws the element in that mode**, as it sets the
     subtree's tokens on the web: a theme inside the one around, which keeps
     what it does not change. */
  return mode === undefined
    ? drawn
    : React.createElement(HelixTheme, key === undefined ? { mode } : { key, mode }, drawn)
}

/** The DOM elements a phone draws as the web does, which `helix shared` passes too. */
const DRAWN_AS_THE_WEB = new Set([
  'circle',
  'ellipse',
  'fieldset',
  'g',
  'legend',
  'line',
  'path',
  'polygon',
  'polyline',
  'rect',
  'svg',
])

/** Warns about a tag a phone does not draw. A component's own type passes. */
const checked = (type: unknown): void => {
  if (typeof type === 'string' && !hasComponent(type) && !DRAWN_AS_THE_WEB.has(type)) {
    warnWebTag(type)
  }
}

export const jsx = (type: unknown, props: Props, key?: React.Key): React.ReactElement => {
  checked(type)
  return make(type, props, key, false)
}

export const jsxs = (type: unknown, props: Props, key?: React.Key): React.ReactElement => {
  checked(type)
  return make(type, props, key, true)
}

export const jsxDEV = (
  type: unknown,
  props: Props,
  key: React.Key | undefined,
  written: boolean,
): React.ReactElement => {
  checked(type)
  return make(type, props, key, written)
}
