'use client'

import { useEffect } from 'react'

/** The cards that draw the moving ring, as `site.css` names them. */
const RINGED = '[data-substrate], [data-closing], [data-card-edge]'

/**
 * Marks each ringed card `data-edge-in-view` while it is on screen, and
 * `site.css` runs the ring only there.
 *
 * **The ring is an infinite animation on every card that has one**, so the
 * landing page ran 24 of them at once with none in view at the top, each
 * repainting its conic gradient every frame. Held still out of view, a reader
 * scrolling to a card finds its ring already turning, which is the only place
 * the motion is seen.
 *
 * **Watched for cards added later as well**, since a client navigation brings a
 * page's cards in without remounting the chrome this sits in. The scan waits
 * for a frame, so a page drawn in many mutations is scanned once.
 */
export function CardEdgeWatch() {
  useEffect(() => {
    const seen = new WeakSet<Element>()
    const watch = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        entry.target.toggleAttribute('data-edge-in-view', entry.isIntersecting)
      }
    })
    const scan = (): void => {
      for (const card of document.querySelectorAll(RINGED)) {
        if (!seen.has(card)) {
          seen.add(card)
          watch.observe(card)
        }
      }
    }
    scan()
    let frame = 0
    const added = new MutationObserver(() => {
      if (frame === 0) {
        frame = requestAnimationFrame(() => {
          frame = 0
          scan()
        })
      }
    })
    added.observe(document.body, { childList: true, subtree: true })
    return () => {
      cancelAnimationFrame(frame)
      added.disconnect()
      watch.disconnect()
    }
  }, [])

  return null
}
