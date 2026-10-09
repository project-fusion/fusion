import type { ReactNode } from 'react'

/**
 * Three clusters of points standing in a box, which is what a 3D scatter
 * answers: where the rows fall on three measures at once, and which ones
 * gather together.
 *
 * **A box drawn as two squares joined at their corners**, without
 * perspective, so the card reads as depth at a glance and keeps the monotone
 * system's three inks: one cluster at 0.3 so the three read apart without a
 * color of their own.
 */
const POINTS: Array<[number, number, number]> = [
  [121.5, 154.5, 0.55],
  [135.2, 150.7, 0.55],
  [127.6, 140.1, 0.55],
  [125.2, 137.5, 0.55],
  [124.5, 145.5, 0.55],
  [117.5, 142.1, 0.55],
  [181.6, 66.3, 0.3],
  [177.6, 75.7, 0.3],
  [179.9, 76.1, 0.3],
  [159.5, 83.9, 0.3],
  [168.6, 80.9, 0.3],
  [182.4, 64.5, 0.3],
  [197.2, 126.5, 0.55],
  [187.9, 127.0, 0.55],
  [179.4, 122.8, 0.55],
  [202.5, 124.6, 0.55],
  [192.1, 108.8, 0.55],
  [190.0, 124.6, 0.55],
]

export const spatialScatterChartArt: ReactNode = (
  <>
    <g opacity="0.28">
      <line
        className="artStroke"
        key="0"
        strokeWidth="1"
        x1="92.0"
        x2="136.0"
        y1="174.0"
        y2="148.0"
      />
      <line
        className="artStroke"
        key="1"
        strokeWidth="1"
        x1="92.0"
        x2="92.0"
        y1="174.0"
        y2="70.0"
      />
      <line
        className="artStroke"
        key="2"
        strokeWidth="1"
        x1="92.0"
        x2="196.0"
        y1="174.0"
        y2="174.0"
      />
      <line
        className="artStroke"
        key="3"
        strokeWidth="1"
        x1="136.0"
        x2="136.0"
        y1="148.0"
        y2="44.0"
      />
      <line
        className="artStroke"
        key="4"
        strokeWidth="1"
        x1="136.0"
        x2="240.0"
        y1="148.0"
        y2="148.0"
      />
      <line
        className="artStroke"
        key="5"
        strokeWidth="1"
        x1="92.0"
        x2="136.0"
        y1="70.0"
        y2="44.0"
      />
      <line
        className="artStroke"
        key="6"
        strokeWidth="1"
        x1="92.0"
        x2="196.0"
        y1="70.0"
        y2="70.0"
      />
      <line
        className="artStroke"
        key="7"
        strokeWidth="1"
        x1="136.0"
        x2="240.0"
        y1="44.0"
        y2="44.0"
      />
      <line
        className="artStroke"
        key="8"
        strokeWidth="1"
        x1="196.0"
        x2="240.0"
        y1="174.0"
        y2="148.0"
      />
      <line
        className="artStroke"
        key="9"
        strokeWidth="1"
        x1="196.0"
        x2="196.0"
        y1="174.0"
        y2="70.0"
      />
      <line
        className="artStroke"
        key="10"
        strokeWidth="1"
        x1="240.0"
        x2="240.0"
        y1="148.0"
        y2="44.0"
      />
      <line
        className="artStroke"
        key="11"
        strokeWidth="1"
        x1="196.0"
        x2="240.0"
        y1="70.0"
        y2="44.0"
      />
    </g>
    {POINTS.map(([x, y, opacity]) => (
      <circle className="artInk" cx={x} cy={y} fillOpacity={opacity} key={`${x}-${y}`} r="4" />
    ))}
  </>
)
