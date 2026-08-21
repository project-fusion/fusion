'use client'

import { type ReactNode, useEffect } from 'react'

/**
 * Holds this candidate in the dark register for as long as it is on screen.
 *
 * The film and the plates were shot for black. Following the reader's system
 * preference would put a light masthead over a night ocean, which is the one
 * combination the transparent header example exists to prevent. Restored on
 * leave, so a trip to Helix does not inherit a mode this page chose for itself.
 */
export function CinematicMode({ children }: { children: ReactNode }) {
  useEffect(() => {
    const root = document.documentElement
    const previous = root.dataset.colorMode
    root.dataset.colorMode = 'dark'
    return () => {
      if (previous) {
        root.dataset.colorMode = previous
      } else {
        delete root.dataset.colorMode
      }
    }
  }, [])
  return children
}
