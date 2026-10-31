import { type ReactNode, useEffect, useRef, useState } from 'react'
import { View } from 'react-native'
import type { Node } from '../style/form'
import type { GridForm, Slotted, Style } from '../style/resolved'
import { holds } from './announced'
import { type Around, AroundContext, type Grown } from './around'
import { type Props, wrapped } from './behavior'
import { flat, step } from './counters'
import { celled, gridded, inCell, placementFor, within } from './grid'
import { drawsOwn, eachChild, insideOf, wordsOf } from './passed'
import { regionContent } from './region-content'
import { silent } from './semantics'
import { bound, type Draw, inherit, type Lazy, laid, resolve, type Scope, split } from './styles'
import { ScaledText } from './text'

/** Sends `load` to its handler. It cannot be canceled. */
const sendLoad = (props: Props): void => {
  const handler = props.onLoad
  if (typeof handler === 'function') {
    handler({ defaultPrevented: false, preventDefault: () => undefined })
  }
}

/**
 * Whether an element's lazy content has been drawn. Once a region calls
 * `due`, the commit after holds it drawn and sends `load`.
 */
export const useLazy = (props: Props): Lazy => {
  const [loaded, setLoaded] = useState(false)
  const due = useRef(false)
  useEffect(() => {
    if (due.current && !loaded) {
      due.current = false
      setLoaded(true)
      sendLoad(props)
    }
  })
  return {
    due: () => {
      due.current = true
    },
    loaded,
  }
}

/** **Lazy content waits for its part to show, and then stays.** */
const waits = (scope: Scope, node: Node, inside: Node | 'host'): boolean => {
  if (scope.lazy.loaded || !bound(scope, node.attributes?.lazy, node.name)) {
    return false
  }
  if (inside !== 'host' && bound(scope, inside.attributes?.hidden, inside.name)) {
    return true
  }
  scope.lazy.due()
  return false
}

/** The part a region is drawn as, where it is one. */
const partOf = (node: Node): string | undefined => {
  const part = node.attributes?.part
  return typeof part === 'string' ? part : undefined
}

/**
 * The view props a region drawn as a part takes, with the part's binding
 * laid over them. A region that is no part takes its own.
 */
const viewOf = (scope: Scope, node: Node, own: Readonly<Record<string, unknown>>) => {
  const part = partOf(node)
  return part === undefined ? own : laid(scope.behavior, part, own, scope.item)
}

/** Whether the part a region is drawn as has a binding, which needs a view to lie over or go around. */
const bindsPart = (scope: Scope, node: Node): boolean => {
  const part = partOf(node)
  const binding = part === undefined ? undefined : scope.behavior.parts[part]
  return binding?.view !== undefined || binding?.wrap !== undefined
}

/** A region's view, with what the binding of the part it is drawn as draws around it. */
const wrappedAs = (scope: Scope, node: Node, view: ReactNode): ReactNode => {
  const part = partOf(node)
  return part === undefined ? view : wrapped(scope.behavior, part, view, node.name)
}

/**
 * A region that is a part draws as the part, with what the part gives the
 * content passed into it: its box, and its text style over its children's.
 */
const drawnAs = (scope: Scope, node: Node): readonly [box: Style, text: Style] => {
  const part = partOf(node)
  if (part === undefined) {
    return [{}, {}]
  }
  const named = resolve(scope, part)
  return split({ ...named.style, ...named.children['*']?.style })
}

/** A child's key, or its place among the region's content where it has none. */
const keyOf = (child: unknown, node: Node, index: number): string =>
  (child as { key?: string | null }).key ?? `${node.name}-${index}`

/**
 * The content passed into a region, each child in what it inherits there.
 *
 * **Each child gets its own place**: whether it is the first, the counters
 * as they stand after it, and what the host gives it there, as
 * `::slotted(:first-child)` and a counter reach it on the web. Counters run
 * in CSS's order: reset on the host, then each child increments and then sets.
 */
const provided = (
  scope: Scope,
  node: Node,
  content: unknown,
  words: Style,
  inside: Node | 'host',
  form?: GridForm,
): ReactNode[] => {
  const around = resolve(scope, inside)
  /* A part that opens a quotation, as a `<q>` does, puts what it holds one
     quotation deeper. */
  const quoted = (scope.base.quoted ?? 0) + (around.opens === true ? 1 : 0)
  /* The custom properties the region sets, which every child inherits. What
     its rules give each child is matched at the child's own place, below. */
  const given = scope.host.contents[node.name]
  /* **What content passed in inherits**, as CSS inheritance gives a slotted
     element on the web: the region's text style. An icon passed in reads its
     color and its size from it. */
  const [, inherits] = split(words)
  const counters: Record<string, number> = { ...scope.host.counting.reset }
  /* White space beside elements draws nothing, as HTML collapses it between boxes. */
  const flattened = flat(content)
  const children =
    flattened.length > 1
      ? flattened.filter((child) => typeof child !== 'string' || child.trim() !== '')
      : flattened
  /* Each child's measured width, where the line around has one for every
     child: a child added or taken away is measured again with the rest. */
  const fill = scope.scrolling?.fill
  const elements = children.filter(
    (child) => typeof child !== 'string' && typeof child !== 'number',
  )
  const least = fill?.least?.length === elements.length ? fill.least : undefined
  const grownAt = (at: number): Grown | undefined =>
    fill === undefined
      ? undefined
      : least === undefined
        ? { report: (width) => fill.report(at, width, elements.length) }
        : { least: least[at] ?? 0 }
  /* The tracks the element shares among what it holds, which a subgrid lines up in. */
  const shared = scope.tracks === undefined ? {} : { tracks: scope.tracks }
  let seen = 0
  /* How many of each kind of element came before, by tag, which a child's
     place among its own kind is. */
  const kinds = new Map<unknown, number>()
  return children.map((child, index) => {
    /* **Words beside elements are drawn as the region draws words**, and
       they are no child, as a text node is none to `:first-child`. */
    if (typeof child === 'string' || typeof child === 'number') {
      const key = `${node.name}-${index}`
      return inCell(
        form,
        key,
        <ScaledText key={key} style={{ ...words, ...wordsMargins(scope, node) }}>
          {child}
        </ScaledText>,
      )
    }
    const place = seen === 0 ? 'first' : 'later'
    const last = seen === elements.length - 1
    const grown = grownAt(seen)
    seen += 1
    const kind = (child as { type?: unknown }).type
    const ofType = (kinds.get(kind) ?? 0) + 1
    kinds.set(kind, ofType)
    const snapshot = step(scope, child, place, counters)
    const fromEnd = elements.length - seen + 1
    const counted = resolve(scope, 'host', {
      child: place,
      counters: snapshot,
      fromEnd,
      index: seen,
      ...insideOf(inside),
      last,
    })
    const styled = layered(counted.children, counted.contents[node.name]?.children)
    const value: Around = {
      /* **A grid's cell is a column its content stretches in.** */
      children: celled(styled, form),
      counters: snapshot,
      custom: { ...around.custom, ...given?.custom },
      ...(grown === undefined ? {} : { grown }),
      ...(scope.base.locale === undefined ? {} : { locale: scope.base.locale }),
      ofType,
      place: { first: place === 'first', fromEnd, index: seen, last },
      ...(quoted === 0 ? {} : { quoted }),
      text: wordsOf(styled, child, inherits),
      ...shared,
      values: around.values,
      within: within(form, around.layout),
    }
    const key = keyOf(child, node, index)
    return inCell(
      form,
      key,
      <AroundContext.Provider key={key} value={value}>
        {child as ReactNode}
      </AroundContext.Provider>,
      () => placementFor(styled, child),
    )
  })
}

/**
 * The margins the host's `::slotted(*)` rules give words passed into a named
 * region. **Words there stand for the element a web page slots in**, as the
 * shared JSX runtime passes a `span` with a `slot` as its words, so a drawer's
 * title keeps the step under it that its `span` takes on the web. Words in
 * the default region are text, which `::slotted()` never matches.
 */
const wordsMargins = (scope: Scope, node: Node): Style => {
  if (node.name === 'default') {
    return {}
  }
  const host = resolve(scope, 'host', { child: 'first' })
  const styled = layered(host.children, host.contents[node.name]?.children)
  const [box] = split(styled['*']?.style ?? {})
  return Object.fromEntries(Object.entries(box).filter(([key]) => key.startsWith('margin')))
}

/**
 * What a region's rules give each child, by its tag, laid over what the
 * host's `::slotted()` rules give it, each tag's entry falling back to `*`'s.
 */
const layered = (
  host: Readonly<Record<string, Slotted>>,
  region: Readonly<Record<string, Slotted>> | undefined,
): Readonly<Record<string, Slotted>> => {
  if (region === undefined || Object.keys(region).length === 0) {
    return host
  }
  const out: Record<string, Slotted> = {}
  for (const tag of new Set([...Object.keys(host), ...Object.keys(region)])) {
    const one = laidOver(host[tag] ?? host['*'], region[tag] ?? region['*'])
    if (one !== undefined) {
      out[tag] = one
    }
  }
  return out
}

/** What `over` gives a child, laid over what `under` gives it. */
const laidOver = (under: Slotted | undefined, over: Slotted | undefined): Slotted | undefined => {
  if (under === undefined || over === undefined) {
    return under ?? over
  }
  const marker = over.marker ?? under.marker
  return {
    counting: under.counting,
    custom: { ...under.custom, ...over.custom },
    ...(marker === undefined ? {} : { marker }),
    style: { ...under.style, ...over.style },
    values: { ...under.values, ...over.values },
  }
}

/**
 * Draws a region: the content passed into it, by `children` for the default
 * region and by the prop of its name for a named one, or the nodes it falls
 * back to where nothing is.
 *
 * **A decorative region is hidden from screen readers**, as `aria-hidden` on
 * its slot hides it on the web, and a `hidden` one draws nothing.
 */
export const drawRegion = (
  scope: Scope,
  node: Node,
  text: Style,
  regions: Style,
  inside: Node | 'host',
  draw: Draw,
): ReactNode => {
  if (holds(scope, node, 'hidden')) {
    return null
  }
  const drawn = drawContent(scope, node, text, regions, inside, draw)
  const empty = drawn === null || (Array.isArray(drawn) && drawn.length === 0)
  if (empty || !holds(scope, node, 'decorative')) {
    return drawn
  }
  return (
    <View key={`${node.name}-unread`} {...silent}>
      {drawn}
    </View>
  )
}

/** What a region draws: what is passed into it, or what it falls back to. */
const drawContent = (
  scope: Scope,
  node: Node,
  text: Style,
  around: Style,
  inside: Node | 'host',
  draw: Draw,
): ReactNode => {
  /* **A rule on the region is the slot's**: its text style is what the
     content inherits and the rest its box, over what the part around gives
     every region it holds. */
  const regions = { ...around, ...scope.host.contents[node.name]?.style }
  /* A copy that holds a slide of its own draws it in its slot, as a carousel's pane. */
  const own = scope.item?.fields.slide
  const content = own === undefined ? regionContent(scope.props, node.name) : own
  /* **A flag is not content.** A list's `loading` is a prop and a region
     both, so `loading` on its own draws the words the region falls back to,
     as React draws nothing for `true`. */
  if (
    content === undefined ||
    content === null ||
    typeof content === 'boolean' ||
    (typeof content === 'string' && drawsOwn(node))
  ) {
    return (node.children ?? []).map((child) => draw(scope, child, text, regions, inside))
  }
  if (waits(scope, node, inside)) {
    return null
  }
  const [box, words] = drawnAs(scope, node)
  const said = inherit(text, words, regions)
  if (typeof content === 'string' || typeof content === 'number') {
    const style = { ...inherit(said, eachChild(scope, node)), ...wordsMargins(scope, node) }
    return wrappedAs(
      scope,
      node,
      <ScaledText key={node.name} {...viewOf(scope, node, { style })}>
        {content}
      </ScaledText>,
    )
  }
  /* **A grid's content is laid out on its tracks.** */
  const form = resolve(scope, inside).grid
  if (form !== undefined) {
    return gridded(scope.base, node.name, form, provided(scope, node, content, said, inside, form))
  }
  const drawn = provided(scope, node, content, said, inside)
  const [frame] = split(regions)
  if (Object.keys(box).length + Object.keys(frame).length === 0 && !bindsPart(scope, node)) {
    return drawn
  }
  return wrappedAs(
    scope,
    node,
    <View key={node.name} {...viewOf(scope, node, { style: [box, frame] })}>
      {drawn}
    </View>,
  )
}
