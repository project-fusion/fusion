import type { ReactNode } from 'react'

/**
 * Three bands stacked on one baseline, which is what separates this card from
 * the line chart's.
 *
 * A line chart's series cross; an area chart's cannot, since each band sits on
 * the one below it. So the card shows three that thicken at different rates
 * under a top edge that only rises, which is the whole reading: the total
 * grew, and it grew mostly in one part.
 *
 * Drawn widest first, as the component draws them, so each band covers the
 * lower part of the one above it.
 */
export const areaChartArt: ReactNode = (
  <>
    <path
      className="artInk"
      d="M64 96L108 90L152 80L196 66L240 56L240 144L64 144Z"
      fillOpacity="0.16"
    />
    <path
      className="artInk"
      d="M64 116L108 112L152 106L196 98L240 92L240 144L64 144Z"
      fillOpacity="0.3"
    />
    <path
      className="artInk"
      d="M64 130L108 128L152 126L196 124L240 122L240 144L64 144Z"
      fillOpacity="0.55"
    />
    <rect className="artRule" height="1" width="224" x="48" y="144" />
  </>
)
