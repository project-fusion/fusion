'use client'

import { useEffect } from 'react'

/** How often to look at where the heading has got to. */
const STEP = 50

/** Consecutive readings in the same place before the page counts as settled. */
const STILL = 6

/** An outer bound, for a page that never settles at all. */
const CAP = 10000

/**
 * Puts the fragment a reader arrived on at the top of the window, once the page
 * has stopped moving under it.
 *
 * **The browser already does this, and here it lands in the wrong place.** It
 * resolves the fragment while parsing, when every `helix-*` on the page is still
 * an unupgraded inline box: on `/legal/terms` the document was 21 pixels tall
 * when this effect first ran, 1,755 when the browser made its own jump, and
 * 2,010 once the elements had upgraded. Each scroll was accurate to the page as
 * it stood and wrong a moment later.
 *
 * **What is watched is the heading's own place in the document**, which is the
 * thing that has to stop changing, and the two tidier signals both miss it. A
 * `requestAnimationFrame` loop never runs at all in a background tab, which is
 * exactly where a fragment link gets opened: middle-clicked out of a contents
 * list. A `ResizeObserver` on the body sees the document's height and not its
 * contents: on `/helix/docs/metrics` a late reflow took 28 pixels out of the
 * page *above* the heading, which moved it without changing the height by a
 * pixel, and the reader landed 28 short. A poll sees both, and `setTimeout` is
 * throttled in a background tab rather than stopped.
 *
 * `whenDefined` is only there to bring the big correction forward, so it does
 * not wait on the next tick.
 *
 * Any wheel, touch or key ends it: hauling somebody back to a heading after
 * they have started reading is worse than never having scrolled.
 *
 * `instant`, because these are corrections rather than journeys. The offset
 * under the masthead is `scroll-margin-block-start` on the heading, which is
 * the browser's own mechanism and is not repeated here.
 */
export function HashTarget(): null {
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1))
    if (!id) {
      return
    }
    const target = document.getElementById(id)
    if (!target) {
      return
    }

    const events = ['wheel', 'touchstart', 'keydown'] as const
    let live = true
    let timer: ReturnType<typeof setTimeout>
    let last = Number.NaN
    let still = 0

    const stop = () => {
      live = false
      clearTimeout(timer)
      clearTimeout(cap)
      for (const name of events) {
        window.removeEventListener(name, stop)
      }
    }

    const nudge = () => target.scrollIntoView({ behavior: 'instant', block: 'start' })

    /* Where the heading sits in the document, which a scroll does not change
       and a reflow above it does. */
    const place = () => Math.round(target.getBoundingClientRect().top + window.scrollY)

    const tick = () => {
      const at = place()
      if (at === last) {
        still += 1
      } else {
        still = 0
        last = at
        nudge()
      }
      if (still >= STILL) {
        stop()
        return
      }
      timer = setTimeout(tick, STEP)
    }

    const cap = setTimeout(stop, CAP)
    for (const name of events) {
      window.addEventListener(name, stop, { once: true, passive: true })
    }

    /* Every tag still waiting on a definition, asked for once. A custom element
       is the only thing `:not(:defined)` can match that carries a hyphen. */
    const pending = [
      ...new Set(
        [...document.querySelectorAll(':not(:defined)')]
          .map((element) => element.localName)
          .filter((name) => name.includes('-')),
      ),
    ]
    void Promise.all(pending.map((name) => customElements.whenDefined(name))).then(() => {
      if (live) {
        still = 0
        nudge()
      }
    })

    tick()
    return stop
  }, [])

  return null
}
