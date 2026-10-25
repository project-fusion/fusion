/**
 * The blur a part draws behind what it holds, as `backdrop-filter: blur()`
 * draws it on the web, through expo-blur.
 */
import { Platform } from 'react-native'
import type { Style } from '../style/resolved'
import { blurs, useBlurTarget } from './blur-target'

/**
 * The radius at which expo-blur's effect is whole, in points: the theme's
 * largest material blur, `material-blur-lg`. A radius is drawn as its share
 * of it, since expo-blur takes an intensity from 1 to 100 and no radius.
 */
export const WHOLE_BLUR = 32

/** The intensity expo-blur draws a blur of `radius` points at, from 1 to 100. */
export const intensityOf = (radius: number): number =>
  Math.max(1, Math.min(100, Math.round((radius / WHOLE_BLUR) * 100)))

/** The whole part, as a style. */
const FILL = { bottom: 0, left: 0, position: 'absolute', right: 0, top: 0 } as const

/** The corner radii a part draws, which its blur keeps to. */
const CORNERS = [
  'borderBottomEndRadius',
  'borderBottomLeftRadius',
  'borderBottomRightRadius',
  'borderBottomStartRadius',
  'borderRadius',
  'borderTopEndRadius',
  'borderTopLeftRadius',
  'borderTopRightRadius',
  'borderTopStartRadius',
] as const

/**
 * The blur behind a part's content, filling the part and keeping to its
 * corners, under everything the part holds.
 *
 * **On iOS it is the platform's blur, which expo-blur draws.** **On Android
 * it blurs the app's blur target**, the `BlurTargetView` the layer host
 * draws the app inside, so a sheet, a popover, or a menu over the app blurs
 * what is under it. A part inside the app draws its own translucent
 * background alone there, as a browser without `backdrop-filter` does, since
 * the BlurView library cannot blur a view that holds the blur. Without the
 * package, a part draws no blur on either.
 */
export const Backdrop = ({
  radius,
  style,
}: {
  readonly radius?: number | undefined
  readonly style: Style
}) => {
  const target = useBlurTarget()
  const android = Platform.OS === 'android'
  const reads = android ? target !== undefined && !target.inside : Platform.OS === 'ios'
  const Blur = radius === undefined || !reads ? null : (blurs()?.BlurView ?? null)
  if (Blur === null || radius === undefined) {
    return null
  }
  const corners: Record<string, unknown> = {}
  for (const corner of CORNERS) {
    if (style[corner] !== undefined) {
      corners[corner] = style[corner]
    }
  }
  const onAndroid =
    android && target !== undefined
      ? { blurMethod: 'dimezisBlurViewSdk31Plus' as const, blurTarget: target.target }
      : {}
  return (
    <Blur
      {...onAndroid}
      intensity={intensityOf(radius)}
      pointerEvents="none"
      style={{ ...FILL, ...corners, overflow: 'hidden' }}
      tint="default"
    />
  )
}
