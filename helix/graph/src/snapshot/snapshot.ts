import {
  type GraphInk,
  type GraphReach,
  graphPicture,
  type PictureMark,
} from '@fusion.dev/helix-core/graph'
import type { NodeLook, NoteFacts } from '../connect-graph/looks.js'

/** A note, as a snapshot draws it: the frame's own, with its place given. */
export interface SnapshotNode extends NoteFacts {
  id: string
  label?: string | undefined
  size?: number | undefined
  x?: number | undefined
  y?: number | undefined
}

/** A link, as a snapshot draws it. */
export interface SnapshotLink {
  source: string
  target: string
}

/** What a snapshot draws, and the box it is drawn for. */
export interface GraphSnapshotOptions {
  /** The selected note, lit as the frame lights it. None by default. */
  active?: string | undefined
  /**
   * The part of the graph the drawing fits, as Sigma's `setCustomBBox` takes
   * it. The box around the notes by default. Give both the same box.
   */
  bounds?: { x: readonly [number, number]; y: readonly [number, number] } | null | undefined
  /** How heavily a note is drawn where it does not say, as the Sigma driver's `emphasis`. */
  emphasis?: NodeLook['emphasis']
  /** Whether each group's name is drawn over its notes, as the Sigma driver's `groupLabels`. On by default. */
  groupLabels?: boolean | undefined
  /** The box's height, in pixels. 480 by default. */
  height?: number | undefined
  /** Which notes are named, as the Sigma driver's `labels`. `hover` by default. */
  labels?: 'all' | 'hover' | 'hubs' | undefined
  /** The room kept at each edge, in pixels, as Sigma's `stagePadding`. 30 by default. */
  padding?: number | undefined
  /** How far `active` reaches, as `connectGraph`'s `reach`. `links` by default. */
  reach?: GraphReach | undefined
  /** A note's shape where it does not say, as the Sigma driver's `shape`. */
  shape?: NodeLook['shape']
  /** The box's width, in pixels. 1200 by default. */
  width?: number | undefined
}

/** Text made safe to write into markup. */
const escaped = (text: string): string =>
  text.replace(
    /[&<>"']/g,
    (character) =>
      ({ "'": '&#39;', '"': '&quot;', '&': '&amp;', '<': '&lt;', '>': '&gt;' })[
        character
      ] as string,
  )

/** A number written short, so a graph of thousands is not a page of decimals. */
const short = (value: number): string => String(Math.round(value * 10) / 10)

/** A token, as CSS reads it. */
const token = (name: string): string => `var(--helix-color-${name})`

/** An ink as CSS writes it: one token moved toward another in sRGB, as `mixRgb` moves it. */
const color = (ink: GraphInk): string =>
  ink.toward === undefined || ink.by === undefined
    ? token(ink.base)
    : `color-mix(in srgb, ${token(ink.toward)} ${short(ink.by)}%, ${token(ink.base)})`

/** A note's shape as markup, about `x` and `y`, `radius` across, as the node program draws it. */
const shapeOf = (
  shape: NonNullable<NodeLook['shape']>,
  x: number,
  y: number,
  radius: number,
  paint: string,
): string => {
  if (shape === 'square') {
    const half = radius * 0.88
    return `<rect height="${short(half * 2)}" rx="${short(radius * 0.18)}" width="${short(half * 2)}" x="${short(x - half)}" y="${short(y - half)}" ${paint}/>`
  }
  if (shape === 'diamond') {
    const reach = radius * 1.216
    return `<path d="M${short(x)} ${short(y - reach)}L${short(x + reach)} ${short(y)}L${short(x)} ${short(y + reach)}L${short(x - reach)} ${short(y)}Z" ${paint}/>`
  }
  return `<circle cx="${short(x)}" cy="${short(y)}" r="${short(radius)}" ${paint}/>`
}

/** A note as markup: its body by its emphasis, and the selected one's glow under it. */
const markOf = ({ emphasis, ink, radius, selected, shape, x, y }: PictureMark): string => {
  const fill = color(ink)
  const body =
    emphasis === 'solid'
      ? shapeOf(shape === 'ring' ? 'circle' : shape, x, y, radius, `style="fill:${fill}"`)
      : /* A band a third of the radius deep, inside the edge, and a faint fill within it where subtle. */
        (emphasis === 'subtle'
          ? shapeOf(shape, x, y, radius, `fill-opacity="0.3" style="fill:${fill}"`)
          : '') +
        shapeOf(
          shape === 'ring' ? 'circle' : shape,
          x,
          y,
          radius * 0.84,
          `fill="none" stroke-width="${short(radius * 0.32)}" style="stroke:${fill}"`,
        )
  /* The selected note's glow: a fine ring just clear of its edge and a soft light past it. */
  const glow = selected
    ? `<circle cx="${short(x)}" cy="${short(y)}" fill-opacity="0.18" r="${short(radius * 2.2)}" style="fill:${fill}"/>` +
      `<circle cx="${short(x)}" cy="${short(y)}" fill="none" r="${short(radius * 1.32)}" stroke-width="${short(Math.max(radius * 0.08, 1))}" style="stroke:${fill}"/>`
    : ''
  return glow + body
}

/**
 * **The graph drawn on the server, as an SVG in the theme's colors**, for a
 * page to paint before the renderer has loaded. Put it in the frame after
 * the element the renderer draws in, and `connectGraph` fades it out once
 * the renderer has drawn the graph whole.
 *
 * **Where Sigma.js draws it**: fitted to the box as Sigma fits a graph, each
 * note its size and its group's or tone's color, each link tinted by the
 * note it leaves, and the names placed after their notes and left out where
 * one would cover another. The colors are the theme's tokens, so it is
 * light or dark with the page.
 *
 * **Whole or absent.** An empty string where any note has no `x` and `y`,
 * since only a layout run in the browser could place it.
 */
export const graphSnapshot = (
  nodes: readonly SnapshotNode[],
  links: readonly SnapshotLink[],
  options: GraphSnapshotOptions = {},
): string => {
  const picture = graphPicture(nodes, links, options)
  if (picture === undefined) {
    return ''
  }
  const { height, width } = picture
  const ground = token('surface-sunken')
  const lines = picture.lines.map(
    (line) =>
      `<line style="stroke:${color(line.ink)}" stroke-width="${line.width}" x1="${short(line.x1)}" x2="${short(line.x2)}" y1="${short(line.y1)}" y2="${short(line.y2)}"/>`,
  )
  const names = picture.names.map(
    (name) =>
      `<text font-size="${name.size}" font-weight="${name.strong ? 600 : 500}" style="fill:${color(name.ink)};stroke:${ground}" x="${short(name.x)}" y="${short(name.y)}">${escaped(name.text)}</text>`,
  )
  const regions = picture.regions.map(
    (region) =>
      `<text dominant-baseline="middle" fill-opacity="${region.fade}" font-size="11" font-weight="650" letter-spacing="0.02em" style="fill:${color(region.ink)};stroke:${ground}" text-anchor="middle" x="${short(region.x)}" y="${short(region.y)}">${escaped(region.text)}</text>`,
  )
  /* The names in the frame's own face, which the markup inherits from the page. */
  return (
    `<div aria-hidden="true" data-helix-graph-snapshot style="inset:0;overflow:hidden;pointer-events:none;position:absolute">` +
    `<svg height="${height}" viewBox="0 0 ${width} ${height}" width="${width}" xmlns="http://www.w3.org/2000/svg" style="left:50%;position:absolute;top:50%;translate:-50% -50%">` +
    `<g stroke-linecap="round">${lines.join('')}</g>` +
    `<g>${picture.marks.map(markOf).join('')}</g>` +
    `<g paint-order="stroke" stroke-linejoin="round" stroke-width="3">${regions.join('')}${names.join('')}</g>` +
    `</svg></div>`
  )
}
