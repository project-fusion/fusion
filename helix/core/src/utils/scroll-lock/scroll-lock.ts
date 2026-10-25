/**
 * The modal surfaces holding the page still, kept on `globalThis` under a
 * registered symbol, so a dialog and a drawer from two copies of Helix agree on
 * one count.
 */
interface ScrollLock {
  gutter: string
  holders: Set<Element>
  overflow: string
  raised: Set<Raised>
}

/**
 * A box that stays above every modal surface: Toast's stack. `raise` puts it
 * back on top of the top layer, `covers` says whether a point lands on it, and
 * `release` tells it a modal surface has let go of the page.
 */
export interface Raised {
  covers(x: number, y: number): boolean
  raise(): void
  release?(): void
}

const SCROLL_LOCK = Symbol.for('fusion.helix.scroll-lock')

/** The record, made the first time anything holds the page. */
const record = (): ScrollLock | undefined =>
  (globalThis as unknown as Record<symbol, ScrollLock | undefined>)[SCROLL_LOCK]

/** The record, made here if nothing has held the page yet. */
const made = (): ScrollLock => {
  const globals = globalThis as unknown as Record<symbol, ScrollLock | undefined>
  globals[SCROLL_LOCK] ??= { gutter: '', holders: new Set(), overflow: '', raised: new Set() }
  /* A record from an older copy of Helix has no `raised`. */
  globals[SCROLL_LOCK].raised ??= new Set()
  return globals[SCROLL_LOCK]
}

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
  const root = document.documentElement
  const lock = made()
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
  if (!lock?.holders.delete(holder)) {
    return
  }
  for (const one of lock.raised) {
    one.release?.()
  }
  if (lock.holders.size > 0) {
    return
  }
  const root = document.documentElement
  root.style.overflow = lock.overflow
  root.style.scrollbarGutter = lock.gutter
}

/** The surfaces holding the page still, in the order they took it. */
export const scrollHolders = (): Element[] => [...(record()?.holders ?? [])]

/**
 * Keeps a box above every modal surface opened after it, until the returned
 * function lets go.
 *
 * The top layer is ordered by when each element entered it, so a modal opened
 * while a toast showed covered the toast with its backdrop: measured, the
 * whole stack sat under the scrim until another message arrived.
 */
export const keepAbove = (one: Raised): (() => void) => {
  made().raised.add(one)
  return () => {
    record()?.raised.delete(one)
  }
}

/** Puts every kept box back on top. A modal surface calls it once it has opened. */
export const raiseAbove = (): void => {
  for (const one of record()?.raised ?? []) {
    one.raise()
  }
}

/**
 * Whether a press lands on a kept box, which a modal surface reads before it
 * takes the press for one on its backdrop.
 *
 * **The box is inert under the modal**, as everything outside it is, so the
 * press passes through it to the backdrop, and a reader pressing a toast's
 * Dismiss closed the Dialog under it instead.
 */
export const coversPress = (event: MouseEvent): boolean =>
  [...(record()?.raised ?? [])].some((one) => one.covers(event.clientX, event.clientY))

/** Who hears a modal surface open, kept on `globalThis` beside the lock. */
const MODAL_HEARD = Symbol.for('fusion.helix.modal-heard')

/** The listeners, made the first time one is added. */
const heard = (): Set<() => void> => {
  const globals = globalThis as unknown as Record<symbol, Set<() => void> | undefined>
  globals[MODAL_HEARD] ??= new Set()
  return globals[MODAL_HEARD]
}

/**
 * Opens `dialog` with `showModal()` and tells each listener `onModalOpen`
 * added, once it stands open.
 *
 * Dialog, Drawer and Lightbox open through it, so a toast's stack can move
 * into the modal that opened: the browser makes everything outside an open
 * modal inert, the top layer included.
 */
export const openModal = (dialog: HTMLDialogElement): void => {
  dialog.showModal()
  for (const hear of [...heard()]) {
    hear()
  }
}

/** Hears each modal surface `openModal` opens, until the returned function is called. */
export const onModalOpen = (hear: () => void): (() => void) => {
  heard().add(hear)
  return () => {
    heard().delete(hear)
  }
}
