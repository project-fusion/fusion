import { addFeature, adoptSheet, capturePointer } from '@fusion.dev/helix-core'
import { type CSSResult, html, nothing, svg, type TemplateResult } from 'lit'
import { type Board, boardOf } from '../board.js'
import { extent, MARGIN } from '../root/canvas-document.js'
import type { HelixHeadlessCanvas } from '../root/canvas-root.js'

/** A box in the document's own units. */
type Area = { x: number; y: number; width: number; height: number }

/** The part of the document on screen, in its own units. */
const onScreen = (inner: Board): Area => {
  const board = extent(inner.nodes)
  const { height, width } = inner.box
  const { x, y, zoom } = inner.at
  return {
    height: height / zoom,
    width: width / zoom,
    x: board.x - MARGIN - x / zoom,
    y: board.y - MARGIN - y / zoom,
  }
}

/** What the minimap shows: every card and what is on screen, with room around them. */
const areaOf = (inner: Board): Area => {
  const board = extent(inner.nodes)
  const view = onScreen(inner)
  const x = Math.min(board.x, view.x)
  const y = Math.min(board.y, view.y)
  const width = Math.max(board.x + board.width, view.x + view.width) - x
  const height = Math.max(board.y + board.height, view.y + view.height) - y
  const room = Math.max(width, height) * 0.05
  return {
    height: height + room * 2,
    width: width + room * 2,
    x: x - room,
    y: y - room,
  }
}

/**
 * A press or a drag on the minimap, which brings the place under it to the
 * middle of the view.
 *
 * **The point is read through the picture's own scale**: the area is drawn
 * whole and centered in the box, so the box's spare width or height is split
 * either side of it.
 */
const point = (board: HelixHeadlessCanvas, event: PointerEvent): void => {
  if (event.type === 'pointermove' && (event.buttons & 1) === 0) {
    return
  }
  const picture = event.currentTarget as SVGSVGElement
  if (event.type === 'pointerdown') {
    if (event.button !== 0) {
      return
    }
    capturePointer(picture, event.pointerId)
  }
  event.preventDefault()
  const inner = boardOf(board)
  const area = areaOf(inner)
  const shown = picture.getBoundingClientRect()
  const scale = Math.min(shown.width / area.width, shown.height / area.height) || 1
  const at = {
    x: area.x + (event.clientX - shown.left - (shown.width - area.width * scale) / 2) / scale,
    y: area.y + (event.clientY - shown.top - (shown.height - area.height * scale) / 2) / scale,
  }
  const drawn = extent(inner.nodes)
  const { zoom } = inner.at
  inner.direct = event.type === 'pointermove'
  inner.touched = true
  inner.at = {
    ...inner.at,
    x: inner.box.width / 2 - (at.x - drawn.x + MARGIN) * zoom,
    y: inner.box.height / 2 - (at.y - drawn.y + MARGIN) * zoom,
  }
}

/**
 * The minimap, under `controls="minimap"`: each card as a box, and a frame
 * around what is on screen.
 *
 * **A picture for a pointer**, hidden from screen readers and taking no
 * focus, as a map's own overview is: the arrow keys and `show()` already take
 * a keyboard to any card, and a second way that says nothing a reader can
 * use would be a stop that does nothing.
 */
const render = (board: HelixHeadlessCanvas): TemplateResult | typeof nothing => {
  const inner = boardOf(board)
  const area = areaOf(inner)
  const view = onScreen(inner)
  const handle = (event: PointerEvent): void => point(board, event)
  /* A size of its own, which a sheet overrides: one drawn from the viewBox
     alone took its height from the area's shape, and in the flow of a
     headless region that moved the box the area is measured from. */
  return html`<svg
    part="minimap"
    aria-hidden="true"
    height="120"
    preserveAspectRatio="xMidYMid meet"
    viewBox=${`${area.x} ${area.y} ${area.width} ${area.height}`}
    width="160"
    @pointerdown=${handle}
    @pointermove=${handle}
  >
    ${inner.nodes.map(
      (node) =>
        svg`<rect part="minimap-node" data-group=${node.type === 'group' ? '' : nothing} x=${node.x} y=${node.y} width=${node.width} height=${node.height} />`,
    )}
    ${svg`<rect part="minimap-view" x=${view.x} y=${view.y} width=${view.width} height=${view.height} />`}
  </svg>`
}

/**
 * Gives every board of a class its minimap, drawn where `controls` names
 * `minimap`. The entries call it for their own tier's class: the headless
 * entry for `HelixHeadlessCanvas`, and the styled one for `HelixCanvas`, with
 * the sheet that draws it.
 */
export const addMinimap = (element: typeof HelixHeadlessCanvas, sheet?: CSSResult): void => {
  addFeature(element, {
    minimap: (board: HelixHeadlessCanvas) => {
      adoptSheet(board, sheet)
      return render(board)
    },
  })
}
