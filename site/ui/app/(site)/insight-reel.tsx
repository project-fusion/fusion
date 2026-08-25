'use client'

import type { HelixCarousel } from '@helix-io/styled'
import { useEffect, useRef } from 'react'

/**
 * How many insight cards the reel shows, decided by the page rather than by the
 * component.
 *
 * **This is the consumer's decision and belongs here**, which is the middle of
 * the three categories `.claude/rules/helix.md` sets out: a component may know
 * its own width and must not know the viewport, and anything that depends on
 * the device or the page is the consumer's. How many cards a reader should meet
 * at once is a fact about this page, so `Carousel` is right not to have an
 * opinion and wrong to be told four at every width.
 *
 * **Measured at 375 before this existed**: `per-view={4}` gave four columns of
 * about 78px, the copy broken one word to a line and clipped mid-word. See 244.
 *
 * **Set after mount rather than rendered, because the server has no width.**
 * Rendering four on the server and one on the client is a hydration mismatch,
 * and guessing on the server is guessing. The markup ships with no `per-view`,
 * which the component reads as one across and is the honest mobile answer, and
 * a wide viewport upgrades it once the client knows. Without JavaScript a
 * reader gets one card at a time at every width, which is worse on a desktop
 * and correct everywhere.
 */
const WIDE = '(min-width: 60rem)'
const ACROSS = 4

export function InsightReel({ children }: { children: React.ReactNode }) {
  const reel = useRef<HelixCarousel>(null)

  useEffect(() => {
    const host = reel.current
    if (!host) {
      return
    }

    const query = window.matchMedia(WIDE)
    /* The property rather than the attribute, so the component's own reflection
       writes the attribute the styles read. Setting both would race it. */
    const apply = () => {
      host.perView = query.matches ? ACROSS : 1
    }

    apply()
    query.addEventListener('change', apply)
    return () => query.removeEventListener('change', apply)
  }, [])

  return (
    <helix-carousel class="insightReel" label="Insights" loop ref={reel}>
      {children}
    </helix-carousel>
  )
}
