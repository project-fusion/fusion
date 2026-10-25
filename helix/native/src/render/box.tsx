import type { ReactNode } from 'react'
import { type StyleProp, View, type ViewStyle } from 'react-native'
import Reanimated from 'react-native-reanimated'
import { type Clip, spotlightOf } from '../style/effects'
import type { Line, Motion, Style, Transition } from '../style/resolved'
import { stepsOf, withoutTransform } from '../style/transforms'
import { animationStyle, transitionStyle, VIEW_MOVES } from './animation'
import { Backdrop } from './backdrop'
import { Clipped } from './clip'
import { Ring } from './ring'

/** Where a line sits along the edge it is drawn on. */
const along = (line: Line): Readonly<Record<string, number>> =>
  line.edge === 'bottom' || line.edge === 'top'
    ? { [line.edge]: line.inset ?? 0, height: line.thickness, left: 0, right: 0 }
    : { bottom: 0, [line.edge]: line.inset ?? 0, top: 0, width: line.thickness }

/** A line along one edge of a part, from a one-color gradient its background sizes to the edge. */
export const Edge = ({ line }: { readonly line: Line | undefined }) =>
  line === undefined ? null : (
    <View
      style={{
        backgroundColor: line.color,
        pointerEvents: 'none',
        position: 'absolute',
        ...along(line),
      }}
    />
  )

/** Whether CSS centers the box in its containing block: `inset: 0` and `margin: auto` on an absolute box. */
const centered = (drawn: Style): boolean =>
  drawn.position === 'absolute' &&
  drawn.top === 0 &&
  drawn.right === 0 &&
  drawn.bottom === 0 &&
  drawn.left === 0 &&
  drawn.margin === 'auto'

/** The layer a centered box is centered in, which the box's containing block fills. */
const LAYER = {
  alignItems: 'center',
  bottom: 0,
  justifyContent: 'center',
  left: 0,
  pointerEvents: 'none',
  position: 'absolute',
  right: 0,
  top: 0,
} as const

/**
 * Reanimated's view, typed as React Native's. A box hands either the same
 * props: its style, with what its binding lays over it. `style()` resolves
 * its values from data, as numbers and strings, which React Native's style
 * types take only through a cast.
 */
const driven = (): typeof View => Reanimated.View as unknown as typeof View

/** What `Box` takes. */
interface BoxProps {
  /**
   * Whether a driver moves the box, which draws the view its binding lies
   * over as Reanimated's `Animated.View`.
   */
  readonly animated?: boolean
  /** The radius of the blur behind what the box holds, in points, where `backdrop-filter` draws one. */
  readonly blur?: number | undefined
  readonly children?: ReactNode
  /** The inset the box is clipped by, where `clip-path` draws one. */
  readonly clip?: Clip | undefined
  /** A line along one edge, where the part's background draws one. */
  readonly line?: Line | undefined
  /** The part's animation, where it has one. */
  readonly motion?: Motion | undefined
  /**
   * Whether the part's rules animate it or move it in some state, so its
   * view is Reanimated's in every state and what it holds is not drawn anew
   * as a state starts its motion.
   */
  readonly moves?: boolean | undefined
  /** The part's style, as `style()` resolves it. */
  readonly style: Style
  /**
   * How each property of the part's style moves to a new value. A box a
   * driver moves takes none, since the driver moves it.
   */
  readonly transitions?: Readonly<Record<string, Transition>>
  /**
   * The view's props besides its style: its accessibility, and what the
   * part's binding lays over it. A `style` here is drawn over the part's own.
   */
  readonly view: Readonly<Record<string, unknown>>
}

const NONE: Readonly<Record<string, Transition>> = {}

/**
 * A box: running the keyframes its animation names and moving each
 * property its transitions name, with the line its background draws along
 * an edge, and centered where CSS centers it. **A ring centered with
 * `inset: 0` and `margin: auto` is centered in an absolute layer.**
 *
 * **A box that animates or moves is Reanimated's view**, which runs CSS
 * animations and transitions on the UI thread. Any other box is a plain view.
 * **A blur, a clip, and a spotlight are views of their own**, behind what the
 * box holds, around it, and around its edges.
 */
export const Box = (props: BoxProps) => {
  const { blur, children, clip, line, style: shadowed, transitions = NONE } = props
  if (clip !== undefined) {
    return (
      <Clipped clip={clip} style={shadowed} transitions={transitions}>
        {(own) => <Box {...props} clip={undefined} style={own} />}
      </Clipped>
    )
  }
  const { animated = false, motion, moves = false, view } = props
  const spot = spotlightOf(shadowed.boxShadow)
  const { boxShadow: _shadow, ...unshadowed } = shadowed
  const drawn = spot === undefined ? shadowed : unshadowed
  const drawing = (
    <>
      <Backdrop radius={blur} style={drawn} />
      {spot === undefined ? null : <Ring radius={drawn.borderRadius} spot={spot} />}
      <Edge line={line} />
      {children}
    </>
  )
  const moving = transitionStyle(transitions, VIEW_MOVES)
  const css = { ...animationStyle(motion, drawn), ...moving }
  const runs = Object.keys(css).length > 0
  /* A transform that moves holds every step, so its two ends have the same
     steps to move between. */
  const steps = stepsOf(
    drawn,
    (moving.transitionProperty as string[] | undefined)?.includes('transform'),
  )
  const transform = steps.length === 0 ? undefined : { transform: steps }
  const { bottom, left, margin, position, right, top, ...rest } = withoutTransform(drawn)
  const { style: over, ...viewProps } = view
  if (!centered(drawn)) {
    const Outer = animated || runs || moves ? driven() : View
    return (
      <Outer
        style={
          [
            { ...rest, bottom, left, margin, position, right, top },
            transform,
            css,
            over,
          ] as StyleProp<ViewStyle>
        }
        {...viewProps}
      >
        {drawing}
      </Outer>
    )
  }
  const Layer = animated ? driven() : View
  const Inner = runs || moves ? driven() : View
  return (
    <Layer style={[LAYER, over] as StyleProp<ViewStyle>} {...viewProps}>
      <Inner style={[rest, transform, css] as StyleProp<ViewStyle>}>{drawing}</Inner>
    </Layer>
  )
}
