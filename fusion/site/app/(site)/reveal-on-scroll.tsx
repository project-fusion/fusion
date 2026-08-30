'use client'

import { useLayoutEffect } from 'react'

/**
 * Sections arrive as they are scrolled to, once, and never on the way back up.
 *
 * **An observer rather than a view timeline, and the reason is the glass.** The
 * CSS version of this animated `opacity` and a `translate` on the section with
 * `animation-fill-mode: both`, which on a view timeline never detaches: the
 * animation stays bound to the element after it has finished, so the section is
 * permanently a composited layer whose computed opacity the browser will not
 * treat as plainly 1. An element like that is a *backdrop root*, and a
 * `backdrop-filter` inside one can only sample what is painted within it. Every
 * card on the landing page sits inside one of these sections and blurs a
 * page-length field that does not, so all of them go flat while their computed
 * `backdrop-filter` still reads `blur(18px)`.
 *
 * A transition ends, where that animation never did: when it finishes the
 * element is at exactly `opacity: 1` with nothing attached to it, and the
 * backdrop root goes away.
 *
 * **And no opacity in the reveal, only `transform`.** Fading forms the same
 * backdrop root for the length of the fade, and it is worst at the end, the
 * flatness lasting until opacity reaches exactly 1, so the blur returns as a
 * step rather than a ramp: on a screen recording the first card snaps from more
 * transparent to less. A `transform` forms no backdrop root, and the section
 * carries its cards in fully lit.
 *
 * **The full list of what forms a backdrop root lives in `site.css`**, above
 * `[data-substrate]`, measured rather than taken from the spec. Consult it
 * before adding a mask, a fade or a transition anywhere above a glass surface.
 *
 * **The hidden state is armed from here, not from the stylesheet**, so a reader
 * whose JavaScript never runs is handed a page rather than eight invisible
 * sections. CSS alone cannot make that promise: a rule that hides a section
 * needs something to un-hide it, and if the thing that would have is the script
 * that failed, the content is gone. Arming in script means the failure mode is
 * no animation instead of no page.
 *
 * **In `useLayoutEffect` and with the first screen resolved synchronously**,
 * because arming after paint would show the sections and then hide them. What is
 * already on screen when this runs is marked shown in the same frame and never
 * transitions; only what is below the fold is armed and observed. `IntersectionObserver`
 * would report the visible ones a frame later, which is a frame of blank page.
 *
 * Reduced motion is answered by doing nothing at all, which leaves every section
 * in its served state.
 */
export function RevealOnScroll() {
  useLayoutEffect(() => {
    const sections = [...document.querySelectorAll<HTMLElement>('[data-reveal]')]
    if (sections.length === 0 || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return
    }

    let watch: IntersectionObserver | undefined

    /* **A hidden document is waited for, not given up on.**
     *
     * Rendering is suspended while a document is hidden: `getBoundingClientRect`
     * answers with zeroes, transitions do not advance, and `IntersectionObserver`
     * delivers no callback at all. Measured directly, an observer on a fixed 50
     * by 50 box in view returned nothing for as long as it was watched. Arming
     * under those conditions pushes every section down its own height and then
     * depends on machinery that is asleep to bring it back.
     *
     * A document is hidden at mount far more often than it sounds: a link opened
     * in a background tab, a restored session, a window behind another, a slow
     * load the reader tabbed away from. Returning instead of waiting gives up
     * for the life of the page, and the reveal never runs again however long the
     * reader stays on it.
     *
     * Waiting costs one listener and removes the failure. Nothing is armed until
     * the document is actually being looked at, which is also the first moment
     * any of the three suspended things starts working again. */
    const arm = () => {
      /* Anything already on screen is shown without arming it, so it never
         carries the hidden state for even one frame. */
      const waiting: HTMLElement[] = []
      for (const section of sections) {
        if (section.getBoundingClientRect().top < window.innerHeight) {
          section.dataset.reveal = 'shown'
        } else {
          section.dataset.reveal = 'armed'
          waiting.push(section)
        }
      }

      if (waiting.length === 0) {
        return
      }

      /* **A quarter of the window, so the rise happens where it can be seen.** A
       smaller margin fires as the section's top crosses the bottom edge: the
       transition then runs while the section is a sliver at the foot of the
       screen and is finished before any of it is comfortably in view. A reader
       scrolling past covers far more ground in that time than the rise itself
       moves, so the motion is there and invisible. */
      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) {
              continue
            }
            ;(entry.target as HTMLElement).dataset.reveal = 'shown'
            observer.unobserve(entry.target)
          }
        },
        { rootMargin: '0px 0px -25% 0px' },
      )
      watch = observer

      for (const section of waiting) {
        observer.observe(section)
      }
    }

    if (document.visibilityState === 'visible') {
      arm()
      return () => watch?.disconnect()
    }

    const whenSeen = () => {
      if (document.visibilityState !== 'visible') {
        return
      }
      document.removeEventListener('visibilitychange', whenSeen)
      arm()
    }
    document.addEventListener('visibilitychange', whenSeen)

    return () => {
      document.removeEventListener('visibilitychange', whenSeen)
      watch?.disconnect()
    }
  }, [])

  return null
}
