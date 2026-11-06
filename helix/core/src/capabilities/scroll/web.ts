import { scrollItemIntoView } from '../../utils/scroll-item-into-view/scroll-item-into-view.js'
import { lockScroll, unlockScroll } from '../../utils/scroll-lock/scroll-lock.js'
import type { Scrolled } from '../types.generated.js'
import type { Scroll } from './contract.generated.js'
import { scrolledAt } from './ends.js'

/** Where `node` stands now. */
const standing = (node: HTMLElement, settled: boolean): Scrolled =>
  scrolledAt(
    { x: node.scrollLeft, y: node.scrollTop },
    {
      content: { height: node.scrollHeight, width: node.scrollWidth },
      frame: { height: node.clientHeight, width: node.clientWidth },
    },
    settled,
  )

/**
 * Scrolls an element with `scrollBy` and `scrollTo`, reveals one in its own
 * scroller with core's `scrollItemIntoView`, reads `scrollLeft` and
 * `scrollTop`, tells where it stands from `scroll` and `scrollend`, and holds
 * the page with core's scroll lock.
 */
export const webScroll: Scroll<HTMLElement> = {
  /* `instant`, as the contract's "at once" asks: under `scroll-behavior:
     smooth`, a drag that scrolls a step each frame starts an animation each
     frame, and the list trails the pointer. */
  by: (node, x, y) => node.scrollBy({ behavior: 'instant', left: x, top: y }),
  /* The layer is the holder core's lock records, which Toast reads to tell
     whether a modal it is outside of is open. A layer that locks twice is one
     holder, as in core's lock. A stop lets go once, so a stop kept from an
     earlier lock cannot let go of a later one. */
  lock: (node) => {
    lockScroll(node)
    let held = true
    return () => {
      if (held) {
        held = false
        unlockScroll(node)
      }
    }
  },
  /* `scroll` as it moves and `scrollend` as it comes to rest, which every
     browser Helix supports sends. */
  observe: (node, changed) => {
    const moved = (): void => changed(standing(node, false))
    const rested = (): void => changed(standing(node, true))
    node.addEventListener('scroll', moved, { passive: true })
    node.addEventListener('scrollend', rested)
    return () => {
      node.removeEventListener('scroll', moved)
      node.removeEventListener('scrollend', rested)
    }
  },
  offset: (node) => ({ x: node.scrollLeft, y: node.scrollTop }),
  /* Only the scroller that holds the node moves. The page stays where it is:
     `scrollItemIntoView` stops its walk before the document. */
  reveal: (node) => scrollItemIntoView(node),
  to: (node, x, y, smooth) =>
    node.scrollTo({ behavior: smooth ? 'smooth' : 'instant', left: x, top: y }),
}
