/**
 * The numbered anatomy markers a family page draws over its headline example.
 *
 * **Drawn from the live parts, never from a picture.** The page sends the
 * example with one `<template data-preview-anatomy>` after it, which lists the
 * family's `@anatomy` names in order, each as `kind:tag:name`. Each name is
 * found here in the rendered example: an `element` is the first `tag` on the
 * page, a `part` is the csspart of that name in the first `tag`'s shadow root,
 * and a `slot` is the content written into the first `tag`'s slot of that
 * name. Each found box gets an outline and its number. A part moved or renamed
 * moves its marker, or loses it, the day it changes.
 *
 * **One layer above everything**, a manual popover, raised again on every
 * draw. An example that opens a modal dialog puts the dialog in the top layer,
 * and a box positioned in the document would be drawn under it.
 *
 * **Redrawn whenever a box can move**: after the elements upgrade, when the
 * example or a marked part resizes, when the frame scrolls or is resized, when
 * an animation ends, and when the page restyles the frame.
 *
 * Hidden from assistive technology. The legend under the frame is the same
 * list in words, and the frame is already a separate document a reader moves
 * through on its own.
 */

import { RESTYLED } from './preview-events'

/** One marker the page asked for. */
interface Mark {
  kind: 'element' | 'part' | 'slot'
  name: string
  tag: string
}

/** The template the page sends after the example, and what it lists. */
const SELECTOR = 'template[data-preview-anatomy]'

/** How big a number's disc is, and how far apart two discs are kept, in pixels. */
const DISC = 20
const GAP = 4

/** How far outside a part its outline is drawn, in pixels. */
const INSET = 3

/** `kind:tag:name` tokens, in order. A token that is not one is skipped. */
const marksOf = (template: Element): Mark[] =>
  (template.getAttribute('data-preview-anatomy') ?? '').split(/\s+/).flatMap((token): Mark[] => {
    const [kind, tag, name] = token.split(':')
    return (kind === 'element' || kind === 'part' || kind === 'slot') && tag && name
      ? [{ kind, name, tag }]
      : []
  })

/** The first element matching `selector` in `scope`, looking through every shadow root. */
const deep = (scope: ParentNode, selector: string): Element | undefined => {
  const found = scope.querySelector(selector)
  if (found) {
    return found
  }
  for (const element of scope.querySelectorAll('*')) {
    const inner = element.shadowRoot && deep(element.shadowRoot, selector)
    if (inner) {
      return inner
    }
  }
  return undefined
}

/**
 * The element carrying csspart `name` in `root`, following `exportparts` into
 * nested shadow roots, so Select's `listbox-items` reaches the listbox's
 * `items`.
 */
const partIn = (root: ShadowRoot, name: string): Element | undefined => {
  const own = root.querySelector(`[part~="${CSS.escape(name)}"]`)
  if (own) {
    return own
  }
  for (const element of root.querySelectorAll('[exportparts]')) {
    for (const pair of (element.getAttribute('exportparts') ?? '').split(',')) {
      const [inner = '', outer = inner] = pair.split(':').map((one) => one.trim())
      if (outer === name && element.shadowRoot) {
        const nested = partIn(element.shadowRoot, inner)
        if (nested) {
          return nested
        }
      }
    }
  }
  return undefined
}

/**
 * The boxes an element draws, through `display: contents`. A slot that draws
 * no box of its own is the content assigned to it: Card's `header` part is
 * the slot its heading arrives through. Button's `text` is a slot that draws
 * one, and is measured as it is.
 */
const boxesOf = (element: Element): DOMRect[] => {
  const own = element.getBoundingClientRect()
  if (own.width > 0 || own.height > 0) {
    return [own]
  }
  if (element instanceof HTMLSlotElement) {
    return element.assignedElements({ flatten: true }).flatMap(boxesOf)
  }
  return [...element.children].flatMap(boxesOf)
}

/** One box around several. */
const union = (boxes: DOMRect[]): DOMRect | undefined => {
  if (boxes.length === 0) {
    return undefined
  }
  const left = Math.min(...boxes.map((box) => box.left))
  const top = Math.min(...boxes.map((box) => box.top))
  const right = Math.max(...boxes.map((box) => box.right))
  const bottom = Math.max(...boxes.map((box) => box.bottom))
  return new DOMRect(left, top, right - left, bottom - top)
}

/** The elements a mark stands for in `scope`, where it finds any. */
const targetsOf = (scope: ParentNode, mark: Mark): Element[] => {
  const host = deep(scope, mark.tag)
  if (!host) {
    return []
  }
  if (mark.kind === 'element') {
    return [host]
  }
  if (mark.kind === 'part') {
    const part = host.shadowRoot && partIn(host.shadowRoot, mark.name)
    return part ? [part] : []
  }
  const written = [...host.children].filter((child) => child.getAttribute('slot') === mark.name)
  if (written.length > 0) {
    return written
  }
  const slot = host.shadowRoot?.querySelector<HTMLSlotElement>(
    `slot[name="${CSS.escape(mark.name)}"]`,
  )
  return slot ? slot.assignedElements({ flatten: true }) : []
}

/** The layer the markers are drawn in, made once. */
let layer: HTMLElement | undefined
const layerOf = (): HTMLElement => {
  if (layer) {
    return layer
  }
  layer = document.createElement('div')
  layer.setAttribute('aria-hidden', 'true')
  layer.setAttribute('popover', 'manual')
  layer.dataset.previewAnatomyLayer = ''
  document.body.append(layer)
  return layer
}

/** What is being drawn, and what watches it. */
let marks: Mark[] = []
let scope: HTMLElement | undefined
const watcher = new ResizeObserver(() => schedule())
/**
 * What `watcher` already observes. **Each element is observed once**, since
 * observing reports the element's size at once, and observing again on every
 * draw made every draw schedule the next.
 */
let watched = new WeakSet<Element>()
const watch = (element: Element): void => {
  if (!watched.has(element)) {
    watched.add(element)
    watcher.observe(element)
  }
}
let pending: ReturnType<typeof setTimeout> | undefined

/**
 * One draw soon, however many reasons arrive before it.
 *
 * **A timer, never `requestAnimationFrame`.** A frame below the fold gets no
 * animation frames in Chromium until it is scrolled into view, so its markers
 * were not drawn when a whole-page picture was taken of it.
 */
const schedule = (): void => {
  if (marks.length === 0 || pending) {
    return
  }
  pending = setTimeout(() => {
    pending = undefined
    draw()
  }, 16)
}

/** Every marker, placed from the boxes as they are now. */
const draw = (): void => {
  if (!scope) {
    return
  }
  const into = layerOf()
  into.replaceChildren()
  watch(scope)
  const placed: { x: number; y: number }[] = []
  marks.forEach((mark, at) => {
    const targets = targetsOf(scope as HTMLElement, mark)
    for (const target of targets) {
      watch(target)
    }
    const box = union(targets.flatMap(boxesOf))
    if (!box) {
      return
    }
    /* Three pixels outside the box, so the line does not sit on the part's
       own border or its text. */
    const outline = document.createElement('div')
    outline.dataset.previewAnatomyOutline = ''
    Object.assign(outline.style, {
      height: `${box.height + 2 * INSET}px`,
      left: `${box.left - INSET}px`,
      top: `${box.top - INSET}px`,
      width: `${box.width + 2 * INSET}px`,
    })
    /* **Beside the part, never on it.** Left of the box first, level with its
       first line; then further left, past a disc already there; then right of
       the box; and last, on its top-left corner, where nothing else fits. */
    const y = Math.min(
      Math.max(box.top + Math.min(box.height, 2 * DISC) / 2 - DISC / 2, GAP),
      innerHeight - DISC - GAP,
    )
    const fits = (x: number): boolean =>
      x >= GAP &&
      x <= innerWidth - DISC - GAP &&
      !placed.some((one) => Math.abs(one.x - x) < DISC + GAP && Math.abs(one.y - y) < DISC + GAP)
    const left = box.left - INSET - GAP - DISC
    const x =
      [left, left - DISC - GAP, box.right + INSET + GAP].find(fits) ??
      Math.min(Math.max(box.left - DISC / 2, GAP), innerWidth - DISC - GAP)
    placed.push({ x, y })
    const disc = document.createElement('span')
    disc.dataset.previewAnatomyNumber = ''
    disc.textContent = String(at + 1)
    Object.assign(disc.style, { left: `${x}px`, top: `${y}px` })
    into.append(outline, disc)
  })
  /* Raised above anything the example put in the top layer since. */
  if (into.matches(':popover-open')) {
    into.hidePopover()
  }
  into.showPopover()
  /* The page marks the figure drawn, which a picture of the page waits for. */
  window.parent?.postMessage({ type: 'helix-preview-anatomy-drawn' }, '*')
}

/**
 * Reads the template in `root`, if the page sent one, and draws its markers
 * once the example's elements are defined. A render without one clears them.
 */
export const drawAnatomy = async (root: HTMLElement): Promise<void> => {
  const template = root.querySelector(SELECTOR)
  marks = template ? marksOf(template) : []
  scope = root
  /* A new render is new elements, so what was watched goes. */
  watcher.disconnect()
  watched = new WeakSet()
  if (marks.length === 0) {
    layer?.replaceChildren()
    return
  }
  const waiting = [...root.querySelectorAll(':not(:defined)')].map((element) =>
    customElements.whenDefined(element.localName),
  )
  await Promise.all(waiting)
  await Promise.all(
    [...root.querySelectorAll('*')].map(
      (element) => (element as { updateComplete?: Promise<unknown> }).updateComplete,
    ),
  )
  schedule()
}

addEventListener('resize', schedule)
addEventListener(RESTYLED, schedule)
addEventListener('scroll', schedule, { capture: true, passive: true })
document.addEventListener('animationend', schedule, { capture: true })
document.addEventListener('transitionend', schedule, { capture: true })
/* An overlay in the example opening or closing, and never the layer itself,
   which draw raises with a hide and a show, so its own toggle would ask for
   the next draw. */
document.addEventListener(
  'toggle',
  (event) => {
    if (event.target !== layer) {
      schedule()
    }
  },
  { capture: true },
)

/** The layer's look, which the frame's own stylesheet cannot hold: it is built here. */
const sheet = document.createElement('style')
sheet.textContent = `
/* Room at each side for a disc beside a part at the edge, while the page has
   asked for markers. */
body:has(template[data-preview-anatomy]) #preview-root { padding-inline: 48px; }
[data-preview-anatomy-layer] {
  background: none; border: 0; inset: 0; margin: 0; overflow: visible; padding: 0;
  pointer-events: none; position: fixed; block-size: 100%; inline-size: 100%;
}
[data-preview-anatomy-outline] {
  border: 1px dashed var(--helix-color-foreground); border-radius: var(--helix-radii-sm);
  box-sizing: border-box; position: fixed;
}
[data-preview-anatomy-number] {
  background: var(--helix-color-foreground); border-radius: 50%;
  box-shadow: 0 0 0 2px var(--helix-color-background);
  color: var(--helix-color-background);
  font: 600 11px/${DISC}px var(--helix-font-sans);
  font-variant-numeric: tabular-nums; height: ${DISC}px; width: ${DISC}px;
  position: fixed; text-align: center;
}
`
document.head.append(sheet)
