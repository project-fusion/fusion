/**
 * The copy of an item a pointer drags: what the item draws, through every
 * shadow root and slot in it, rebuilt as plain elements with the styles the
 * browser computed for each written on it.
 *
 * `ReorderController` puts the copy in the host's own shadow root, in the top
 * layer, so the page's markup is never touched and no scrolling box clips it.
 * A copy is inert: it has no custom elements, no slots, and no attributes but
 * a picture's, so nothing in it upgrades, takes the host's children, or joins
 * a radio group. Pseudo-elements are not copied.
 */

import { html, nothing, type TemplateResult } from 'lit'

/**
 * The part a host draws for the drag preview: an empty manual popover,
 * hidden from assistive technology, which `ReorderController` fills with a
 * copy of the item a pointer drags and shows in the top layer. Closed, it
 * takes no room. Drawn while `on`, which is while the host reorders.
 */
export const drawDragPreview = (on: boolean): TemplateResult | typeof nothing =>
  on ? html`<div part="drag-preview" popover="manual" aria-hidden="true" inert></div>` : nothing

/** A point in the viewport, where the boxes of a copy are measured from. */
interface Origin {
  x: number
  y: number
}

/** The nodes an element draws: a slot's assigned nodes or its fallback, or a shadow root's. */
const drawn = (node: Node): Node[] => {
  const assigned = node instanceof HTMLSlotElement ? node.assignedNodes({ flatten: true }) : []
  return [...(assigned.length ? assigned : ((node as Element).shadowRoot ?? node).childNodes)]
}

/**
 * The box an element draws: its own, or the boxes of what it draws together,
 * for an element that is `display: contents`, such as a row of a grid.
 */
export const boxOf = (element: Element): DOMRect => {
  if (getComputedStyle(element).display !== 'contents') {
    return element.getBoundingClientRect()
  }
  let [left, top, right, bottom] = [Infinity, Infinity, -Infinity, -Infinity]
  for (const node of drawn(element)) {
    const box = node instanceof Element && boxOf(node)
    if (box && (box.width || box.height)) {
      left = Math.min(left, box.left)
      top = Math.min(top, box.top)
      right = Math.max(right, box.right)
      bottom = Math.max(bottom, box.bottom)
    }
  }
  return left <= right ? new DOMRect(left, top, right - left, bottom - top) : new DOMRect()
}

/**
 * A copy of what a node draws, for a drag preview, with every style the
 * browser computed for each part written on it. The custom properties are
 * left out, having done their work, and so are the logical properties, whose
 * physical twins are written: two of a pair in one style do not agree on
 * which wins.
 *
 * A `placed` node is put where it is with `position: absolute`, measured from
 * `origin`, the padding box it is placed in, rather than laid out again. The
 * root of a preview is placed in the preview, whose padding box is the root's
 * box as `boxOf` measures it, and so is whatever a grid lays out, since a
 * subgrid has no tracks of its own once it is copied out of its grid. An
 * element that is `display: contents`, such as a row whose cells sit in the
 * grid of its table, has each of its cells put where it is.
 */
export const dragPreviewOf = (node: Node, placed: boolean, origin: Origin): Node[] => {
  if (node instanceof Text) {
    return [node.cloneNode()]
  }
  const style = node instanceof Element ? getComputedStyle(node) : undefined
  if (!style || style.display === 'none') {
    return []
  }
  const element = node as Element
  const tag = element.localName
  /* A picture keeps what it draws. A custom element, which could upgrade, and
     a slot, which could take the host's children, are drawn as plain boxes,
     and nothing else keeps an attribute. */
  const whole = /^(img|svg)$/.test(tag)
  const copy = whole
    ? (element.cloneNode(true) as HTMLElement | SVGElement)
    : document.createElement(/-|^slot$/.test(tag) ? 'div' : tag)
  const contents = style.display === 'contents'
  const box = element.getBoundingClientRect()
  let written = ''
  for (let index = 0; index < style.length; index += 1) {
    const name = style.item(index)
    if (!/^--|block|inline|start-|end-/.test(name)) {
      written += `${name}:${style.getPropertyValue(name)};`
    }
  }
  /* Off the grid as well, whose area would be what it is placed in. */
  copy.style.cssText =
    placed && !contents
      ? `${written}position:absolute;inset:auto;left:${box.left - origin.x}px;top:${box.top - origin.y}px;width:${box.width}px;height:${box.height}px;margin:0;box-sizing:border-box;grid-area:auto`
      : written
  if (!whole) {
    const inner =
      !contents && (placed || style.position !== 'static')
        ? { x: box.left + element.clientLeft, y: box.top + element.clientTop }
        : origin
    const grid = contents ? placed : style.display.endsWith('grid')
    copy.append(...drawn(element).flatMap((child) => dragPreviewOf(child, grid, inner)))
  }
  return [copy]
}
