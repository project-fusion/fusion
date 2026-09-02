'use client'

import { type ReactNode, useEffect, useRef } from 'react'

/**
 * Holds an SVG's animation timeline still while nobody is looking at it.
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
