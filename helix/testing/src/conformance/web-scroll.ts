import type { Updatable } from './web-left.js'

/*
 * A scroll on the web half: the part that scrolls is moved and sends one
 * `scroll` and one `scrollend`, as a reader's scroll that comes to rest does.
 */

/**
 * The part of the element that scrolls: the first in its shadow root whose
 * overflow scrolls along either axis, or the element itself.
 */
const scrollerOf = (root: Updatable): HTMLElement => {
  const scrolls = (value: string) => value === 'auto' || value === 'scroll'
  const found = [...(root.shadowRoot?.querySelectorAll('*') ?? [])].find((one) => {
    const style = getComputedStyle(one)
    return scrolls(style.overflowX) || scrolls(style.overflowY)
  })
  return found instanceof HTMLElement ? found : root
}

/**
 * Stops a scroll event the browser sent itself at the part that scrolls.
 * **A scroll is sent once, by the harness**: moving a part that has room to
 * move makes the browser send its own `scroll` and `scrollend` a frame
 * later, which the part would send on again after the ones dispatched here.
 * Stopped at the part in the capture phase, so a listener on the document,
 * as an outline's, still hears the page move.
 */
const untrusted = (event: Event): void => {
  if (event.isTrusted) {
    event.stopImmediatePropagation()
  }
}

/** Scrolls the element's part that scrolls to `x` and `y`. */
export const scroll = (root: Updatable, x: number, y: number): void => {
  const scroller = scrollerOf(root)
  for (const type of ['scroll', 'scrollend']) {
    scroller.addEventListener(type, untrusted, { capture: true })
  }
  scroller.scrollLeft = x
  scroller.scrollTop = y
  scroller.dispatchEvent(new Event('scroll'))
  scroller.dispatchEvent(new Event('scrollend'))
}
