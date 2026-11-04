/**
 * Vector drawing with `react-native-svg`: a family's shapes, such as a
 * meter's ring, and the glyphs an icon draws.
 *
 * **`react-native-svg` is an optional peer**, loaded the first time a shape
 * or a glyph is drawn, as `expo-haptics` is loaded at the first touch. An
 * app that draws no vector needs nothing. One that draws a vector without
 * the package gets an error that names it and the command that installs it.
 *
 * **A box whose attributes name a `viewBox` draws a vector**, and each box
 * inside it whose attributes name a `shape` draws that shape: a `circle`,
 * an `ellipse`, a `line`, a `path`, or a `rect`, at the geometry its
 * attributes give, which a CSS `cx`, `cy`, or `r` overrides. Its paint is its
 * style: `fill`, `stroke`, `stroke-width`, `stroke-dasharray`,
 * `stroke-dashoffset`, `stroke-linecap`, and the rest, and its keyframes and
 * transitions move them.
 *
 * **A vector draws a shape for each entry of a list** where a repeat inside it
 * reads one, as a bar plot draws a column for each reading, its geometry read
 * from the entry. A `gradient` is a paint that draws nothing itself: its stops
 * take their color and opacity from their style, and a shape's `fill:
 * url(#id)` names it.
 *
 * **The vector is a layer of its own.** `react-native-svg` draws a whole canvas
 * again when any shape in it changes, so the canvas is drawn again only when
 * what it draws changes, and what an element lays over it, a chart's cursor,
 * moves without it.
 */

import { type ComponentType, createElement, type ReactNode } from 'react'
import Reanimated from 'react-native-reanimated'
import type * as Svg from 'react-native-svg'
import type { Node } from '../style/form'
import type { Style } from '../style/resolved'
import { animationStyle, transitionStyle } from './animation'
import { entriesOf } from './repeat'
import { bound, PAINT, paintOf, resolve, type Scope, type Styling } from './styles'
import { Canvas } from './vector-canvas'
import { dashed, listedDashes, listedFrames } from './vector-dashes'

/** The package, loaded at the first vector: `null` where the app does not install it. */
let loaded: typeof Svg | null | undefined

/** The error a vector drawn without `react-native-svg` throws. */
export const svgMissing = (): Error =>
  new Error(
    "Helix's native vectors, such as a meter's ring and an icon, need react-native-svg, " +
      'which the app does not install. In an Expo app, install it with ' +
      '`npx expo install react-native-svg`.',
  )

/**
 * `react-native-svg`, loaded once. **A `require` inside a `try`**, which Metro
 * bundles as an optional dependency, so an app without the package builds.
 *
 * @throws The error that names the package, where it is missing.
 */
export const svg = (): typeof Svg => {
  if (loaded === undefined) {
    try {
      loaded = require('react-native-svg') as typeof Svg
    } catch {
      loaded = null
    }
  }
  if (loaded === null) {
    throw svgMissing()
  }
  return loaded
}

/** Each shape's component, by the name a `shape` attribute gives it. */
const KINDS = {
  circle: 'Circle',
  ellipse: 'Ellipse',
  gradient: 'LinearGradient',
  line: 'Line',
  path: 'Path',
  rect: 'Rect',
  stop: 'Stop',
} as const

type Kind = keyof typeof KINDS

/** Each shape's component as Reanimated's, which runs CSS animations and transitions on its paint. */
const animated = new Map<Kind, ComponentType<Record<string, unknown>>>()

const componentOf = (kind: Kind, moves: boolean): ComponentType<Record<string, unknown>> => {
  const plain = svg()[KINDS[kind]] as unknown as ComponentType<Record<string, unknown>>
  if (!moves) {
    return plain
  }
  let made = animated.get(kind)
  if (made === undefined) {
    made = Reanimated.createAnimatedComponent(plain) as unknown as ComponentType<
      Record<string, unknown>
    >
    animated.set(kind, made)
  }
  return made
}

/** The width and height of a `viewBox`, `0 0 100 100`. */
const boxOf = (viewBox: string): readonly [width: number, height: number] => {
  const [, , width = 100, height = 100] = viewBox
    .trim()
    .split(/[\s,]+/)
    .map(Number)
  return [width, height]
}

/**
 * A coordinate in the vector's units: a number as it is, and a percentage of
 * the `viewBox`'s width, its height, or, for a radius, its diagonal over
 * root 2, as SVG reads one.
 */
const unitsOf = (
  value: unknown,
  [width, height]: readonly [number, number],
  axis: 'x' | 'y' | 'r',
): number | undefined => {
  if (typeof value === 'number') {
    return value
  }
  if (typeof value !== 'string') {
    return undefined
  }
  const whole =
    axis === 'x' ? width : axis === 'y' ? height : Math.sqrt((width ** 2 + height ** 2) / 2)
  /* A share of the box and points, as a ring's radius is half its box less
     half its stroke. A point is a unit of the vector, as a CSS pixel is. */
  const mixed = /^calc\((-?[\d.]+)% \+ (-?[\d.]+)px\)$/.exec(value.trim())
  if (mixed !== null) {
    return (Number(mixed[1]) / 100) * whole + Number(mixed[2])
  }
  const percent = /^(-?\d*\.?\d+)%$/.exec(value.trim())
  if (percent === null) {
    const amount = Number(value)
    return Number.isNaN(amount) ? undefined : amount
  }
  return (Number(percent[1]) / 100) * whole
}

/** The geometry attributes each kind of shape takes, and the axis a percentage of each reads. */
const GEOMETRY: Readonly<Record<string, 'x' | 'y' | 'r'>> = {
  cx: 'x',
  cy: 'y',
  height: 'y',
  offset: 'x',
  r: 'r',
  rx: 'x',
  ry: 'y',
  width: 'x',
  x: 'x',
  x1: 'x',
  x2: 'x',
  y: 'y',
  y1: 'y',
  y2: 'y',
}

/** How long a shape's outline is, in its units, where that can be known from its geometry. */
const outline = (kind: Kind, at: Readonly<Record<string, number>>): number | undefined => {
  switch (kind) {
    case 'circle':
      return at.r === undefined ? undefined : 2 * Math.PI * at.r
    case 'line':
      return Math.hypot((at.x2 ?? 0) - (at.x1 ?? 0), (at.y2 ?? 0) - (at.y1 ?? 0))
    case 'rect':
      return at.width === undefined || at.height === undefined
        ? undefined
        : 2 * (at.width + at.height)
    default:
      return undefined
  }
}

/**
 * A shape's geometry in the vector's units. **Geometry may bind a prop or a
 * value the element computes**, as a code's modules are a path it derives and
 * a bar plot's column its entry's place, and a CSS `cx`, `cy`, or `r`
 * overrides it.
 */
const geometryOf = (
  styling: Styling,
  node: Node,
  style: Style,
  viewBox: readonly [number, number],
): Record<string, number> => {
  const given = Object.fromEntries(
    Object.keys(GEOMETRY).map((name) => [name, bound(styling, node.attributes?.[name], node.name)]),
  )
  const attributes = { ...given, ...paintOf(style) }
  const geometry: Record<string, number> = {}
  for (const [name, axis] of Object.entries(GEOMETRY)) {
    const at = unitsOf(attributes[name], viewBox, axis)
    if (at !== undefined) {
      geometry[name] = at
    }
  }
  return geometry
}

/** Draws one shape of a vector, in the paint its style gives it. */
const drawShape = (
  styling: Styling,
  node: Node,
  extra: Parameters<typeof resolve>[2],
  viewBox: readonly [number, number],
  key: string = node.name,
): ReactNode => {
  const kind = node.attributes?.shape
  if (typeof kind !== 'string' || !(kind in KINDS)) {
    return null
  }
  const resolved = resolve(styling, node, extra)
  /* A shape whose style says `display: none` is not drawn, as on the web,
     where a loader's `pulse` takes its arc away. */
  if (resolved.style.display === 'none') {
    return null
  }
  const geometry = geometryOf(styling, node, resolved.style, viewBox)
  const length = Number(node.attributes?.pathLength)
  const whole = outline(kind as Kind, geometry)
  const by = Number.isFinite(length) && length > 0 && whole !== undefined ? whole / length : 1
  const paint = Object.fromEntries(
    Object.entries(dashed(paintOf(resolved.style), by)).filter(([name]) => !(name in GEOMETRY)),
  )
  const motion =
    resolved.motion === undefined
      ? undefined
      : {
          ...resolved.motion,
          keyframes: Object.fromEntries(
            Object.entries(resolved.motion.keyframes).map(([at, frame]) => [at, dashed(frame, by)]),
          ),
        }
  const css = { ...animationStyle(motion, paint), ...transitionStyle(resolved.transitions, PAINT) }
  const d = bound(styling, node.attributes?.d, node.name)
  const moves = Object.keys(css).length > 0
  const painted = paintedBy(paint, resolved.style.opacity)
  return createElement(
    componentOf(kind as Kind, moves),
    {
      ...geometry,
      ...(typeof d === 'string' ? { d } : {}),
      ...(typeof node.attributes?.id === 'string' ? { id: node.attributes.id } : {}),
      key,
      style: moves ? { ...listedDashes(painted), ...listedFrames(css) } : { ...painted, ...css },
    },
    kind === 'gradient'
      ? (node.children ?? []).map((stop, at) =>
          drawShape(styling, stop, extra, viewBox, `${stop.name}-${at}`),
        )
      : undefined,
  )
}

/**
 * A shape's paint as `react-native-svg` takes it: a gradient a `fill` names as
 * `url(#id)`, without the quotes CSS may write around it, and the shape's own
 * `opacity`, which a view would take and a shape takes as its own.
 */
const paintedBy = (paint: Style, opacity: unknown): Style => {
  const out: Record<string, number | string> = { ...paint }
  for (const name of ['fill', 'stroke'] as const) {
    const named =
      typeof paint[name] === 'string'
        ? /^url\(\s*["']?#([^"')\s]+)["']?\s*\)$/.exec(String(paint[name]))
        : null
    if (named !== null) {
      out[name] = `url(#${named[1]})`
    }
  }
  if (typeof opacity === 'number') {
    out.opacity = opacity
  }
  return out
}

/** A shape a vector draws, with the entry of the repeat's copy it is drawn for. */
interface Placed {
  readonly key: string
  readonly node: Node
  readonly styling: Styling
}

/**
 * The shapes a vector draws, in order: each shape, the shapes a `when` holds
 * while what it reads holds, as a meter's ticks are drawn while it has
 * thresholds, and the shapes a repeat holds for each entry of its list, as a
 * bar plot's columns, each reading its entry's fields.
 */
const drawn = (styling: Styling, nodes: readonly Node[], key = ''): Placed[] =>
  nodes.flatMap((node, at): Placed[] => {
    if (node.kind === 'when') {
      return Boolean(styling.base.conditions[node.name]) !== (node.attributes?.unless === true)
        ? drawn(styling, node.children ?? [], `${key}${node.name}-`)
        : []
    }
    if (node.kind === 'repeat') {
      const entries = entriesOf(styling as Scope, node) ?? []
      return entries.flatMap((fields, index) =>
        drawn(
          { ...styling, item: { fields, index } },
          node.children ?? [],
          `${key}${node.name}-${index}-`,
        ),
      )
    }
    return [{ key: `${key}${node.name}-${at}`, node, styling }]
  })

/**
 * The vector's box, `0 0 100 100`, or, **for a vector written with `none`,
 * its own size in points**, as an `<svg>` with no `viewBox` measures in its
 * own pixels: the size of the box that draws it, where that is a number.
 */
const viewBoxOf = (viewBox: string, own: Style | undefined): string => {
  if (viewBox !== 'none') {
    return viewBox
  }
  const width = own?.width
  const height = own?.height
  return typeof width === 'number' && typeof height === 'number'
    ? `0 0 ${width} ${height}`
    : '0 0 100 100'
}

/**
 * The vector a box with a `viewBox` draws: the shapes inside it, filling the
 * box. `extra` is what each shape is resolved under, such as the color of
 * the text around it, and `own` the box's own style, whose size is the box
 * of a vector written with `none`.
 */
export const drawVector = (
  styling: Styling,
  node: Node,
  extra: Parameters<typeof resolve>[2],
  own?: Style,
): ReactNode => {
  /* A view box may be a value the element computes, as a half ring crops its box to its thickness. */
  const written = bound(styling, node.attributes?.viewBox, node.name)
  if (typeof written !== 'string' || written === '') {
    return null
  }
  const viewBox = viewBoxOf(written, own)
  /* A height in rems is only a least past the largest standard text size, and a
     vector at 100% of no height stands as tall as the window. */
  const height =
    own?.height === undefined && typeof own?.minHeight === 'number' ? own.minHeight : '100%'
  const shapes = drawn(styling, node.children ?? []).map((one) =>
    drawShape(one.styling, one.node, extra, boxOf(viewBox), one.key),
  )
  const aspect = node.attributes?.preserveAspectRatio
  return (
    <Canvas
      aspect={typeof aspect === 'string' ? aspect : undefined}
      height={height}
      key={`${node.name}-vector`}
      shapes={shapes}
      viewBox={viewBox}
    />
  )
}

export { glyphs, type Icon } from './glyphs'
