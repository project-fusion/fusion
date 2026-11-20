/**
 * A family drawn small, for the picture at the start of a row in a family
 * page's choosing table.
 *
 * **The running example, never a stored image.** The page sends a family's
 * headline example with one `<template data-preview-picture>` after it. The
 * example is drawn at one scale, placed by the boxes it draws, so a picture
 * changes the day the component does.
 *
 * **One scale in every tile**, so a control is pictured at the same size in
 * every row. Scaled to fit, an Icon Button shrank to an 8 pixel glyph beside a
 * Button near its real size, and a field's label to 4 pixel type. At three
 * quarters, a 12 pixel label is 9 pixels and 14 pixel body text 10.5. It is laid
 * out at one width in every tile, the width the larger tile shows at that
 * scale, so a field that fills its line fills that tile. The phone's smaller
 * tile crops the same layout, where a width of its own had squeezed a
 * button's words to an ellipsis.
 *
 * **Centered where it fits, and held at the start where it does not.** On
 * each axis an example that fits the tile is centered, so a Button sits in
 * the middle. One that overflows starts at the tile's top or inline-start
 * edge, inside its margin, and fades out at the far edge. Centered, the crop
 * cut a field's label through its top and its help text through its bottom,
 * as half glyphs. A box that is `fixed` or visually hidden is left out, as the
 * frame's own measurement leaves it out.
 *
 * **Fitted again whenever a box can change size**: after the elements
 * upgrade, when a font lands, when the frame is resized, and when the page
 * restyles it.
 */

import { RESTYLED } from './preview-events'

/** The template the page sends after the example. */
const SELECTOR = 'template[data-preview-picture]'

/** The space kept between an example and the tile's start edges, in pixels. */
const MARGIN = 8

/** How far the far edge of an example that overflows fades, in pixels. */
const FADE = 16

/** The scale every picture is drawn at. */
const SCALE = 0.75

/**
 * The width the example is laid out at, in pixels: the larger tile's 112, less
 * 8 at each side, at `SCALE`.
 */
const CANVAS = 128

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

/** The example scaled and placed in the frame, measured unscaled. */
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
  const wide = SCALE * (right - left) > innerWidth - 2 * MARGIN
  const tall = SCALE * (bottom - top) > innerHeight - 2 * MARGIN
  const rtl = document.documentElement.dir === 'rtl'
  const x = !wide
    ? innerWidth / 2 - SCALE * ((left + right) / 2)
    : rtl
      ? innerWidth - MARGIN - SCALE * right
      : MARGIN - SCALE * left
  const y = tall ? MARGIN - SCALE * top : innerHeight / 2 - SCALE * ((top + bottom) / 2)
  scope.style.transform = `translate(${x}px, ${y}px) scale(${SCALE})`
  document.body.dataset.pictureCrop = [wide && 'inline', tall && 'block'].filter(Boolean).join(' ')
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
    delete document.body.dataset.pictureCrop
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
/* The far edge of an example that overflows, faded into the tile's
   background, so a line it cuts ends in a fade and not a half glyph. */
body[data-picture-crop~="block"]::after,
body[data-picture-crop~="inline"]::before {
  content: ""; pointer-events: none; position: fixed; z-index: 1;
}
body[data-picture-crop~="block"]::after {
  background: linear-gradient(to bottom, transparent, var(--helix-color-background));
  block-size: ${FADE}px; inset: auto 0 0 0;
}
body[data-picture-crop~="inline"]::before {
  background: linear-gradient(to right, transparent, var(--helix-color-background));
  inline-size: ${FADE}px; inset: 0 0 0 auto;
}
[dir="rtl"] body[data-picture-crop~="inline"]::before {
  background: linear-gradient(to left, transparent, var(--helix-color-background));
  inset: 0 auto 0 0;
}
`
document.head.append(sheet)
