/**
 * A family drawn small, for the picture at the start of a row in a family
 * page's choosing table.
 *
 * **The running example, never a stored image.** The page sends a family's
 * headline example with one `<template data-preview-picture>` after it. The
 * example is laid out at the width of a narrow column, then scaled to fit the
 * frame and centered in it, so a picture changes the day the component does.
 *
 * Scaled by the boxes the example draws, to fit the tile, and to four fifths
 * of its size at most. A Button is pictured near its real size in the middle
 * of the tile, and a Card is pictured whole at a fraction of its size. A box that is `fixed` or visually
 * hidden is left out, as the frame's own measurement leaves it out.
 *
 * **Fitted again whenever a box can change size**: after the elements
 * upgrade, when a font lands, when the frame is resized, and when the page
 * restyles it.
 */

import { RESTYLED } from './preview-events'

/** The template the page sends after the example. */
const SELECTOR = 'template[data-preview-picture]'

/**
 * The width the example is laid out at before it is scaled, in pixels: a
 * narrow column, so a field that fills its line is pictured large enough to
 * read as a field.
 */
const CANVAS = 240

/**
 * The largest scale, so every family reads as one drawn small, a Button
 * among them.
 */
const LARGEST = 0.8

/** The space kept between the example and the edge of the frame, in pixels. */
const MARGIN = 8

/** What is pictured, and what watches it. */
let scope: HTMLElement | undefined
const watcher = new ResizeObserver(() => schedule())
let pending: ReturnType<typeof setTimeout> | undefined

/** One fit soon, however many reasons arrive before it. A timer, for `preview-anatomy.ts`'s reason. */
const schedule = (): void => {
  if (!scope || pending) {
    return
  }
  pending = setTimeout(() => {
    pending = undefined
    fit()
  }, 16)
}

/** Whether a box is drawn content, as the frame's measurement decides it. */
const shown = (node: Element): boolean => {
  const style = getComputedStyle(node)
  return style.position !== 'fixed' && style.clipPath !== 'inset(50%)'
}

/** The boxes one child draws, through `display: contents`. */
const drawn = (child: Element): DOMRect[] => {
  if (!shown(child)) {
    return []
  }
  const own = child.getBoundingClientRect()
  if (own.width > 0 || own.height > 0) {
    return [own]
  }
  return [...child.querySelectorAll('*')]
    .filter(shown)
    .map((node) => node.getBoundingClientRect())
    .filter((box) => box.width > 0 || box.height > 0)
}

/** The example scaled to the frame and centered in it, measured unscaled. */
const fit = (): void => {
  if (!scope) {
    return
  }
  scope.style.transform = 'none'
  const boxes = [...scope.children].flatMap(drawn)
  if (boxes.length === 0) {
    return
  }
  const left = Math.min(...boxes.map((box) => box.left))
  const top = Math.min(...boxes.map((box) => box.top))
  const right = Math.max(...boxes.map((box) => box.right))
  const bottom = Math.max(...boxes.map((box) => box.bottom))
  const scale = Math.min(
    LARGEST,
    (innerWidth - 2 * MARGIN) / Math.max(right - left, 1),
    (innerHeight - 2 * MARGIN) / Math.max(bottom - top, 1),
  )
  const x = innerWidth / 2 - scale * ((left + right) / 2)
  const y = innerHeight / 2 - scale * ((top + bottom) / 2)
  scope.style.transform = `translate(${x}px, ${y}px) scale(${scale})`
}

/**
 * Pictures the example in `root` where the page sent the template, once its
 * elements are defined. A render without one puts the root back.
 */
export const drawPicture = async (root: HTMLElement): Promise<void> => {
  watcher.disconnect()
  if (!root.querySelector(SELECTOR)) {
    scope = undefined
    root.style.removeProperty('transform')
    return
  }
  scope = root
  const waiting = [...root.querySelectorAll(':not(:defined)')].map((element) =>
    customElements.whenDefined(element.localName),
  )
  await Promise.all(waiting)
  watcher.observe(root)
  for (const child of root.children) {
    watcher.observe(child)
  }
  schedule()
}

addEventListener('resize', schedule)
addEventListener(RESTYLED, schedule)
void document.fonts?.ready.then(schedule)

/** The picture's layout, which the frame's own stylesheet cannot hold: it is built here. */
const sheet = document.createElement('style')
sheet.textContent = `
body:has(${SELECTOR}) { margin: 0; overflow: hidden; }
body:has(${SELECTOR}) #preview-root {
  inline-size: ${CANVAS}px; inset: 0 auto auto 0; margin: 0; min-block-size: 0;
  padding: 0; pointer-events: none; position: absolute; transform-origin: 0 0;
}
`
document.head.append(sheet)
