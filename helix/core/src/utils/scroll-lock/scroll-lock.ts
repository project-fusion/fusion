/**
 * The modal surfaces holding the page still, kept on `globalThis` under a
 * registered symbol, so a dialog and a drawer from two copies of Helix agree on
 * one count.
 */
interface ScrollLock {
  gutter: string
  holders: Set<Element>
  overflow: string
}

const SCROLL_LOCK = Symbol.for('fusion.helix.scroll-lock')

/** The record, made the first time anything holds the page. */
const record = (): ScrollLock | undefined =>
  (globalThis as unknown as Record<symbol, ScrollLock | undefined>)[SCROLL_LOCK]

/**
 * Stops the page behind a modal surface from scrolling.
 *
 * `showModal()` makes the page inert and leaves it scrollable, so a wheel over
 * the backdrop moves the page under the dialog. `overflow: hidden` on the root
 * stops that, and `scrollbar-gutter: stable` keeps the space a classic
 * scrollbar took, so the page does not shift sideways when it goes. What the
 * root carried before is put back when the last holder lets go.
 *
 * Dialog, Drawer and Lightbox hold it, and Toast reads who does.
 */
export const lockScroll = (holder: Element): void => {
  const globals = globalThis as unknown as Record<symbol, ScrollLock | undefined>
  const root = document.documentElement
  globals[SCROLL_LOCK] ??= { gutter: '', holders: new Set(), overflow: '' }
  const lock = globals[SCROLL_LOCK]
  if (lock.holders.has(holder)) {
    return
  }
  if (lock.holders.size === 0) {
    lock.overflow = root.style.overflow
    lock.gutter = root.style.scrollbarGutter
    if (window.innerWidth > root.clientWidth) {
      root.style.scrollbarGutter = 'stable'
    }
    root.style.overflow = 'hidden'
  }
  lock.holders.add(holder)
}

/** Lets go of the page, and gives it back once nothing else holds it. */
export const unlockScroll = (holder: Element): void => {
  const lock = record()
  if (!lock?.holders.delete(holder) || lock.holders.size > 0) {
    return
  }
  const root = document.documentElement
  root.style.overflow = lock.overflow
  root.style.scrollbarGutter = lock.gutter
}

/** The surfaces holding the page still, in the order they took it. */
export const scrollHolders = (): Element[] => [...(record()?.holders ?? [])]
