/**
 * A part clipped by `clip-path: inset()`, as a panel is revealed from its top
 * edge down: a phone has no clip path, so the part is drawn in a view that
 * hides what overflows it, inset from the part's edges, and the part stands
 * out past that view by the same insets, so it is laid out at its own size.
 * A view around both takes the part's place and size among its siblings.
 */
import { type ReactNode, useState } from 'react'
import { type LayoutChangeEvent, type StyleProp, View, type ViewStyle } from 'react-native'
import Reanimated from 'react-native-reanimated'
import { type Clip, clipEdges, sized } from '../style/effects'
import type { Style, Transition } from '../style/resolved'
import { transitionStyle } from './animation'

/** The style that places and sizes a part among its siblings, which the view around it takes. */
const PLACING = new Set([
  'alignSelf',
  'aspectRatio',
  'bottom',
  'end',
  'flex',
  'flexBasis',
  'flexGrow',
  'flexShrink',
  'height',
  'left',
  'margin',
  'marginBottom',
  'marginEnd',
  'marginHorizontal',
  'marginLeft',
  'marginRight',
  'marginStart',
  'marginTop',
  'marginVertical',
  'maxHeight',
  'maxWidth',
  'minHeight',
  'minWidth',
  'position',
  'right',
  'start',
  'top',
  'width',
  'zIndex',
])

/** A part's style as what the view around it takes and what the part keeps. */
export const placedApart = (style: Style): readonly [around: Style, own: Style] => {
  const around: Record<string, number | string> = {}
  const own: Record<string, number | string> = {}
  for (const [key, value] of Object.entries(style)) {
    if (PLACING.has(key)) {
      around[key] = value
    } else {
      own[key] = value
    }
  }
  return [around, own]
}

/** The margins that move a view in by each edge of a clip, or out by it where `sign` is -1. */
const insetBy = (
  edges: ReturnType<typeof clipEdges>,
  sign: 1 | -1,
): Readonly<Record<string, number>> => ({
  marginBottom: sign * edges.bottom,
  marginLeft: sign * edges.left,
  marginRight: sign * edges.right,
  marginTop: sign * edges.top,
})

/** The margins a clip moves, each by the move `clip-path`'s transition names. */
const MARGINS = new Set(['marginBottom', 'marginLeft', 'marginRight', 'marginTop'])

/** What `Clipped` takes. */
interface ClippedProps {
  /** Draws the part with the style it keeps, standing out past the clip. */
  readonly children: (own: Style) => ReactNode
  readonly clip: Clip
  readonly style: Style
  /** How the part's properties move, of which a clip reads `clipPath`. */
  readonly transitions: Readonly<Record<string, Transition>>
}

/**
 * Draws a part clipped by an inset, which a transition of `clip-path` moves
 * as the web's does, so a reveal runs on a phone too.
 *
 * **An inset in a percentage is a share of the part's own size**, as
 * `inset(0 0 100% 0)` hides the whole part, so the part is measured first and
 * stands unseen until it is.
 */
export const Clipped = ({ children, clip, style, transitions }: ClippedProps) => {
  const [box, setBox] = useState<{ height: number; width: number }>()
  const [around, own] = placedApart(style)
  const measured = box !== undefined || !sized(clip)
  const edges = clipEdges(clip, box?.width ?? 0, box?.height ?? 0)
  const move = transitions.clipPath
  const moving =
    move === undefined
      ? {}
      : transitionStyle(Object.fromEntries([...MARGINS].map((margin) => [margin, move])), MARGINS)
  const measure = (event: LayoutChangeEvent) => {
    const { height, width } = event.nativeEvent.layout
    setBox((was) => (was?.height === height && was.width === width ? was : { height, width }))
  }
  const frame = {
    flexGrow: 1,
    overflow: 'hidden',
    ...(clip.radius === undefined ? {} : { borderRadius: clip.radius }),
    ...insetBy(edges, 1),
    ...moving,
  }
  /* The part stands out past the clip in a view of its own, so the moves
     its own rules name stay its own. */
  const out = { flexGrow: 1, ...insetBy(edges, -1), ...moving }
  return (
    <View
      onLayout={measure}
      style={[around, measured ? null : { opacity: 0 }] as StyleProp<ViewStyle>}
    >
      <Reanimated.View style={frame as StyleProp<ViewStyle>}>
        <Reanimated.View style={out as StyleProp<ViewStyle>}>
          {children({ ...own, flexGrow: 1 })}
        </Reanimated.View>
      </Reanimated.View>
    </View>
  )
}
