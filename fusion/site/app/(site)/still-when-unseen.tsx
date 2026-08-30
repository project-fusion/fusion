'use client'

import { type ReactNode, useEffect, useRef } from 'react'

/**
 * Holds an SVG's animation timeline still while nobody is looking at it.
 *
 * **SMIL keeps its own clock, and `content-visibility` does not reach it.**
 * The `<animate>` elements in the derivation figure are SMIL, the XML animation
 * spec SVG implements, rather than CSS: eight of them, running from load to
 * unload whatever is on screen. Skipping the band's paint spares the compositor
 * and leaves that clock ticking, which is work for a drawing nobody can see.
 *
 * `pauseAnimations` stops the whole document timeline in one call rather than
 * per element, so eight animations cost one observer and two lines.
 *
 * **The figure stays server-rendered.** The SVG arrives as `children` from a
 * server component and this only holds the ref, so none of that markup is
 * shipped as JavaScript to be re-created on the client. The alternative, making
 * the diagram itself a client component, would have sent every path, every
 * coordinate and every comment through the bundle to save the same clock.
 *
 * **The aura does this for itself and this is the same shape.** That component
 * pauses on `IntersectionObserver` and on `visibilitychange`; a document that
 * is hidden already stops SMIL, so only the first is needed here.
 */
export function StillWhenUnseen({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  const host = useRef<HTMLElement>(null)

  useEffect(() => {
    const figure = host.current
    const svg = figure?.querySelector('svg')
    if (!figure || !svg) {
      return
    }

    const watch = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) {
        svg.unpauseAnimations()
      } else {
        svg.pauseAnimations()
      }
    })
    watch.observe(figure)

    return () => watch.disconnect()
  }, [])

  return (
    <figure className={className} ref={host}>
      {children}
    </figure>
  )
}
