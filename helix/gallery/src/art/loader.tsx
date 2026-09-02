import type { ReactNode } from 'react'

/**
 * Marks around a ring, at `loader-lg`. Marks rather than an arc, because
 * that is what the component draws, and because an arc would need a stroke.
 * It rotates about its own bounding-box center.
 */
export const loaderArt: ReactNode = (
  <g className="artSpin">
    {[
      { cx: 160, cy: 85, o: 0.55 },
      { cx: 170.6, cy: 89.4, o: 0.46 },
      { cx: 175, cy: 100, o: 0.38 },
      { cx: 170.6, cy: 110.6, o: 0.3 },
      { cx: 160, cy: 115, o: 0.24 },
      { cx: 149.4, cy: 110.6, o: 0.18 },
      { cx: 145, cy: 100, o: 0.14 },
      { cx: 149.4, cy: 89.4, o: 0.1 },
    ].map((mark) => (
      <circle
        className="artInk"
        cx={mark.cx}
        cy={mark.cy}
        fillOpacity={mark.o}
        key={`${mark.cx}-${mark.cy}`}
        r="2.5"
      />
    ))}
  </g>
)
