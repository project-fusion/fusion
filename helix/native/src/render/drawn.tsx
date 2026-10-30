/**
 * A box that draws another element, as a checkbox group's select-all is a
 * checkbox: that element, with the props its machines give it.
 *
 * **The element around styles the parts the box exports.** A rule on
 * `select-all-box` is `[part="select-all"]::part(box)` on the web, and here
 * the style of the drawn element's `box`, resolved under the element
 * around, laid over its own.
 *
 * **The custom properties of the parts around the box reach it**, as they
 * inherit through the web's flat tree into its shadow root, so a token a
 * part sets for its subtree reaches the element it draws.
 *
 * **A wrap that draws an element passes what it holds in as the element's
 * default region**, and a node it holds `into` a region into that region, as a copy button draws a tooltip around its press, and
 * `gives` names props the element takes from the element around: a value,
 * or what a `bind()` reads. A flag given words holds while they are not
 * empty, as a tooltip stands open while a copy's result has words.
 *
 * **The events its `bubbles` names reach the element around as its own**,
 * as a composed event leaves a shadow root on the web: a crumb hears the
 * `select` of a row of the menu its fold draws, and a refusal there refuses
 * the row's.
 */
import { type ReactNode, useContext } from 'react'
import { collection } from '../machines/collection'
import { type HelixEvent, handlerOf, tell } from '../machines/props'
import type { Node } from '../style/form'
import type { Style } from '../style/resolved'
import { type Around, AroundContext, useInheritedText } from './around'
import { type Made, madeFor } from './made'
import { bound, camel, resolve, type Scope } from './styles'
import { drawText } from './words-node'

/** The parts the box exports, by their names in the drawn element. */
const exportsOf = (node: Node): readonly string[] => {
  const exports = node.attributes?.exports
  return exports !== null && typeof exports === 'object' ? Object.keys(exports) : []
}

/** The props `node` gives the element it draws, by React's names, as its `gives` says. */
const givenBy = (scope: Scope, node: Node, made: Made): Record<string, unknown> => {
  const gives = node.attributes?.gives
  if (gives === null || typeof gives !== 'object') {
    return {}
  }
  const flags = new Set(
    (made.family.api?.props ?? []).filter((one) => one.type === 'boolean').map((one) => one.name),
  )
  const out: Record<string, unknown> = {}
  for (const [name, attribute] of Object.entries(gives)) {
    const value = bound(scope, attribute, node.name)
    out[camel(name)] = flags.has(name) && typeof value === 'string' ? value !== '' : value
  }
  return out
}

/**
 * The style a node's own rules give where it stands, which reaches the host
 * of the element it draws, as the part is that host on the web: a tour
 * stop's Skip keeps to the start with `margin-inline-end: auto`. Its margins
 * and how it sits in the line it stands in, and nothing the element draws.
 */
const PLACING = /^(margin|align[A-Z]|flex[A-Z]?|order$)/

/** What the element a node draws takes over its host style from where the node stands. */
const placedBy = (style: Style): Around['children'] => {
  const placing = Object.fromEntries(Object.entries(style).filter(([name]) => PLACING.test(name)))
  return Object.keys(placing).length === 0
    ? {}
    : {
        '*': {
          counting: { increment: {}, reset: {}, set: {} },
          custom: {},
          style: placing,
          values: {},
        },
      }
}

/** The attribute that marks a node a wrap passes into the element it draws. */
const PASSED = 'passed-in'

/**
 * What an element drawn by a node a wrap passes in reads around it: where
 * the element it is passed into lays it out, and what that one's rules give
 * what is passed in, as a slotted element is laid out by the slot it is in
 * on the web, with the custom properties, the values, and the part styles of
 * the element that draws it over those. **A crumb's fold mark is laid out by
 * the button it is passed into**, centered there as an icon passed into any
 * button is.
 */
const PassedIn = ({
  around,
  children,
}: {
  readonly around: Around
  readonly children: ReactNode
}) => {
  const outer = useContext(AroundContext)
  const value =
    outer === undefined
      ? around
      : {
          ...outer,
          custom: { ...outer.custom, ...around.custom },
          ...(around.parts === undefined ? {} : { parts: around.parts }),
          values: { ...outer.values, ...around.values },
        }
  return <AroundContext.Provider value={value}>{children}</AroundContext.Provider>
}

/**
 * Words a wrap passes into the element it draws, in the text style of the
 * region they land in, as slotted text inherits from the slot's part on the
 * web: a tour stop's Next is in its button's label color, where the stop's
 * own color stood before.
 */
const RegionText = ({ node, scope }: { readonly node: Node; readonly scope: Scope }) =>
  drawText(scope, node, useInheritedText())

/**
 * What the region around an item another element draws gives it, with the
 * style its node's own rules give where it stands laid over, as a tour
 * stop's Skip, a Button, keeps to the start of its row.
 */
const Placed = ({
  around,
  children,
}: {
  readonly around: Around
  readonly children: ReactNode
}) => {
  const outer = useContext(AroundContext)
  const value: Around =
    outer === undefined ? around : { ...outer, children: { ...outer.children, ...around.children } }
  return <AroundContext.Provider value={value}>{children}</AroundContext.Provider>
}

/** The handlers that tell the element around the events `node` bubbles, by React's names. */
const bubbledBy = (scope: Scope, node: Node): Record<string, (heard: HelixEvent) => void> => {
  const bubbles = node.attributes?.bubbles
  const out: Record<string, (heard: HelixEvent) => void> = {}
  for (const event of typeof bubbles === 'string' ? bubbles.split(/\s+/).filter(Boolean) : []) {
    out[handlerOf(event)] = (heard) => {
      if (!tell(scope.family, scope.props, event, heard.detail, heard.target)) {
        heard.preventDefault()
      }
    }
  }
  return out
}

/** What a machine gives the element `node` draws in this copy of a repeat, as each ramp of a color picker. */
const copyViewOf = (scope: Scope, node: Node): Readonly<Record<string, unknown>> | undefined =>
  scope.item === undefined ? undefined : scope.behavior.parts[node.name]?.copy?.(scope.item)

/**
 * Draws the element `node` draws, with what a wrap holds passed in as its
 * default region, or nothing where no component was made for it. `draws` is
 * the element's tag, as the form names it.
 */
export const drawDrawn = (
  scope: Scope,
  node: Node,
  draws: string,
  children?: ReactNode,
  regions: Readonly<Record<string, ReactNode>> = {},
): ReactNode => {
  const made = madeFor(draws)
  if (made === undefined) {
    return null
  }
  const parts: Record<string, Style> = {}
  for (const part of exportsOf(node)) {
    const { style } = resolve(scope, `${node.name}-${part}`)
    if (Object.keys(style).length > 0) {
      parts[part] = style
    }
  }
  const box = resolve(scope, node)
  const around: Around = {
    children: placedBy(box.style),
    custom: box.custom,
    ...(Object.keys(parts).length === 0 ? {} : { parts }),
    values: box.values,
    within: box.layout,
  }
  const into: Record<string, ReactNode> = {}
  for (const [region, held] of Object.entries(regions)) {
    into[camel(region)] = held
  }
  const element = (
    <made.Component
      key={node.name}
      {...givenBy(scope, node, made)}
      {...bubbledBy(scope, node)}
      {...into}
      {...scope.behavior.parts[node.name]?.view}
      {...copyViewOf(scope, node)}
    >
      {children}
    </made.Component>
  )
  /* **An item drawn inside an element another one draws is that element's**:
     it joins that one's set and takes what that one gives what it holds, as
     a crumb's fold draws its rows in the menu it draws. */
  const of = made.family.api?.item?.of
  if (of !== undefined && of !== scope.family.name) {
    return Object.keys(around.children).length === 0 ? (
      element
    ) : (
      <Placed around={around} key={node.name}>
        {element}
      </Placed>
    )
  }
  const drawn =
    node.attributes?.[PASSED] === true ? (
      <PassedIn around={around} key={node.name}>
        {element}
      </PassedIn>
    ) : (
      <AroundContext.Provider key={node.name} value={around}>
        {element}
      </AroundContext.Provider>
    )
  /* **It joins no set of the element that draws it**, as the web draws it in
     that element's shadow root, as a checkbox group's select-all is no box
     of the group. */
  if (of === undefined) {
    return drawn
  }
  const Outside = collection(of).Provider
  return (
    <Outside key={node.name} value={undefined}>
      {drawn}
    </Outside>
  )
}

/**
 * Draws the element a box or a wrap draws: a wrap passes what it holds into
 * the element's default region, and **a node it holds `into` a region into
 * that region**, as a crumb's fold button is the trigger of the menu it
 * draws. `held` draws a list of the wrap's nodes where the wrap stands.
 */
export const drawDrawnNode = (
  scope: Scope,
  node: Node,
  draws: string,
  held: (children: readonly Node[]) => ReactNode,
): ReactNode => {
  if (node.kind !== 'wrap') {
    return drawDrawn(scope, node, draws)
  }
  const into = (child: Node) =>
    typeof child.attributes?.into === 'string' ? child.attributes.into : undefined
  /* An element a node the wrap holds draws is passed into the element the
     wrap draws. Any other node keeps its place in the tree. */
  const children = (node.children ?? []).map((child) =>
    typeof child.attributes?.draws === 'string'
      ? { ...child, attributes: { ...child.attributes, [PASSED]: true } }
      : child,
  )
  const regions: Record<string, ReactNode> = {}
  for (const child of children) {
    const region = into(child)
    if (region !== undefined) {
      regions[region] = held([child])
    }
  }
  return drawDrawn(
    scope,
    node,
    draws,
    children
      .filter((child) => into(child) === undefined)
      .map((child) =>
        child.kind === 'text' ? (
          <RegionText key={child.name} node={child} scope={scope} />
        ) : (
          held([child])
        ),
      ),
    regions,
  )
}
