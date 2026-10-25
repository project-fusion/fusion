/**
 * The scrim a spotlight's spread shadow paints around its box, as Tour's
 * `0 0 0 200vmax` dims the window around its target.
 *
 * **Four bands and four corners, never one border.** A border as wide as the
 * spread, rounded, is drawn by iOS into a picture of the whole ring, and a
 * ring 200vmax wide is a picture far larger than any phone draws: it drew
 * nothing at all on an iPhone 18 Pro. Each band is a plain view of the
 * scrim's color, above, below, and beside the box, and each corner inside
 * the box is a small vector that rounds the hole by the box's radius, as a
 * spread shadow's inner corners are. The bands meet without overlapping, so
 * a translucent scrim is one tint everywhere.
 */
import type { ReactNode } from 'react'
import { View } from 'react-native'
import type { Spotlight } from '../style/effects'
import { svg } from './vector'

/** A band of the scrim, placed against the box. */
const band = (color: string, at: Readonly<Record<string, number>>): ReactNode => (
  <View
    key={Object.keys(at).join()}
    style={{ backgroundColor: color, pointerEvents: 'none', position: 'absolute', ...at }}
  />
)

/** The corners of the hole, each with the side it stands against and the arc that rounds it. */
const CORNERS = [
  { at: { left: 0, top: 0 }, d: (r: number) => `M0 0H${r}A${r} ${r} 0 0 0 0 ${r}Z` },
  { at: { right: 0, top: 0 }, d: (r: number) => `M${r} 0V${r}A${r} ${r} 0 0 0 0 0Z` },
  { at: { bottom: 0, right: 0 }, d: (r: number) => `M${r} ${r}H0A${r} ${r} 0 0 0 ${r} 0Z` },
  { at: { bottom: 0, left: 0 }, d: (r: number) => `M0 ${r}V0A${r} ${r} 0 0 0 ${r} ${r}Z` },
] as const

/** The corners that round the hole by `radius`, or none where it is square or no vectors draw. */
const corners = (color: string, radius: number): ReactNode => {
  if (radius <= 0) {
    return null
  }
  let drawing: ReturnType<typeof svg>
  try {
    drawing = svg()
  } catch {
    return null
  }
  const { Path, Svg } = drawing
  return CORNERS.map(({ at, d }) => (
    <Svg
      height={radius}
      key={Object.keys(at).join()}
      pointerEvents="none"
      style={{ position: 'absolute', ...at }}
      width={radius}
    >
      <Path d={d(radius)} fill={color} />
    </Svg>
  ))
}

/**
 * The scrim around the box, as far out as the spread on every side, with
 * the hole rounded by `radius`.
 */
export const Ring = ({ radius, spot }: { readonly radius: unknown; readonly spot: Spotlight }) => {
  const { color, spread } = spot
  const round = typeof radius === 'number' ? radius : 0
  return (
    <>
      {band(color, { height: spread, left: -spread, right: -spread, top: -spread })}
      {band(color, { bottom: -spread, height: spread, left: -spread, right: -spread })}
      {band(color, { bottom: 0, left: -spread, top: 0, width: spread })}
      {band(color, { bottom: 0, right: -spread, top: 0, width: spread })}
      {corners(color, round)}
    </>
  )
}
