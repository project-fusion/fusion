import type { ReactNode } from 'react'

/**
 * A cloud of points rising from left to right, with nothing joining them.
 *
 * The card's whole claim is the one a scatter answers: the two measures move
 * together. So the points drift upward loosely rather than on a line, since a
 * relation a reader has to see through the scatter is the honest picture of
 * one, and the two rules are both measured axes.
 */
const POINTS: Array<[number, number, number]> = [
  [72, 132, 0.55],
  [86, 124, 0.3],
  [98, 128, 0.55],
  [112, 114, 0.55],
  [124, 118, 0.3],
  [138, 104, 0.55],
  [150, 108, 0.3],
  [164, 94, 0.55],
  [178, 98, 0.3],
  [190, 84, 0.55],
  [204, 88, 0.55],
  [218, 74, 0.3],
  [230, 70, 0.55],
]

export const scatterChartArt: ReactNode = (
  <>
    {POINTS.map(([x, y, opacity]) => (
      <circle className="artInk" cx={x} cy={y} fillOpacity={opacity} key={`${x}-${y}`} r="4" />
    ))}
    <rect className="artRule" height="1" width="224" x="48" y="144" />
    <rect className="artRule" height="96" width="1" x="48" y="48" />
  </>
)
