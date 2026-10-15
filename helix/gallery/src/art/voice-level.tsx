import type { ReactNode } from 'react'

/** The row's bars, its slot width, and where it starts, so the row sits centered on the card. */
const BARS = 24
const SLOT = 8
const START = 160 - (BARS * SLOT) / 2
const THICK = 4

/** One still reading with the shape of speech: loud low bands, falling off toward the high ones. */
const BAND = [
  0.35, 0.5, 0.7, 0.85, 0.9, 0.8, 0.75, 0.7, 0.72, 0.65, 0.6, 0.55, 0.6, 0.5, 0.45, 0.4, 0.42, 0.35,
  0.3, 0.28, 0.22, 0.18, 0.12, 0.08,
]

/* The component's own envelope and color step: tallest in the middle, and the
   middle half of the row in the stronger ink. */
const bars = BAND.map((band, at) => {
  const envelope = 0.25 + 0.75 * Math.sin((Math.PI * (at + 0.5)) / BARS) ** 1.2
  const tall = THICK + band * envelope * 72
  return {
    center: Math.abs(at + 0.5 - BARS / 2) < BARS / 4,
    tall,
    x: START + SLOT * at + (SLOT - THICK) / 2,
  }
})

/**
 * A spectrum of thin rounded bars, swelling in the middle, which is what the
 * component draws for a voice at a steady level.
 */
export const voiceLevelArt: ReactNode = (
  <g>
    {bars.map((bar) => (
      <rect
        className="artInk"
        fillOpacity={bar.center ? '0.55' : '0.28'}
        height={bar.tall.toFixed(2)}
        key={bar.x}
        rx={THICK / 2}
        width={THICK}
        x={bar.x}
        y={(100 - bar.tall / 2).toFixed(2)}
      />
    ))}
  </g>
)
