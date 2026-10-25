/**
 * A layer's swipe: a touch moves the layer toward the edge of the window it
 * stands along, rests it at one of its snap points, or takes it out through
 * that edge, as a drawer and a sheet are swiped on the web.
 *
 * **A layer swipes where its node says `swipe`**, along its `edge`, or along
 * the window's bottom edge while it is a sheet. Its `snap` binds the prop
 * that holds the shares of it a reader can leave on screen, as a drawer's
 * `snap-points` holds `0.5 1`, and its element is in the state `snapped`
 * while it rests short of the whole. **A swipe out asks the layer to
 * dismiss**, as every other way out does, so its `closes` event may refuse
 * it, and `closedby="none"` keeps it, and the layer goes back to where it
 * rested.
 */
import { swipeEdge } from '@fusion.dev/helix-core/swipe'
import type { ReactNode } from 'react'
import { useWindowDimensions } from 'react-native'
import { GestureDetector } from 'react-native-gesture-handler'
import Animated from 'react-native-reanimated'
import { type SwipeScroller, useSwipe } from '../drivers/swipe'
import type { MachineUse } from '../ir.generated'
import type { PartBinding, Props } from '../render/behavior'
import { direction } from '../render/styles'
import type { Family, Node } from '../style/form'
import { valued } from './gives'
import { beyond } from './layering'
import { boundTo } from './props'

/** The edges a layer stands along, as its `edge` names them. */
type Edge = 'bottom' | 'end' | 'start' | 'top'

const EDGES: readonly string[] = ['bottom', 'end', 'start', 'top']

/** What one of a layer's attributes says: the prop it binds, or the value written on the node. */
const said = (family: Family, props: Props, use: MachineUse, name: string, node?: Node) => {
  const prop = boundTo(use, name, 'prop')
  return prop === undefined ? node?.attributes?.[name] : valued(family, props, prop)
}

/** What a layer's swipe gives its machine. */
export interface LayerSwipe {
  /**
   * What the swipe lays over the layer's part: a view around it that its
   * pan moves and measures, so the layer's own transform, as an entrance
   * slides it, is left to its rules.
   */
  readonly binding: PartBinding
  /** The edge the layer stands along, which the host draws it against, where it names one. */
  readonly edge?: Edge | undefined
  /** What a scroller inside the layer takes, so the swipe hears its drag. */
  readonly scroller?: SwipeScroller | undefined
  /** The states the swipe gives the element: `snapped`, while it rests short of the whole. */
  readonly states: Readonly<Record<string, boolean>>
  /**
   * Opens the layer to its largest snap point where the view focus moved to
   * stands past the window's edge, as the web's drawer does, so a reader who
   * moves through a half open sheet never lands on a control they cannot see.
   */
  readonly reveal?: ((node: unknown) => void) | undefined
}

/** What `useLayerSwipe` reads beside the element's props. */
export interface SwipeAround {
  /** Asks the layer to dismiss, and gives whether it will. */
  readonly dismiss: () => boolean
  readonly node: Node | undefined
  readonly open: boolean
  /** Whether the layer is a sheet now, which swipes along the bottom edge. */
  readonly sheet: boolean
}

/** A hook a layer calls to swipe: `useLayerSwipe` where its node swipes, and `useStill` where it does not. */
export type Swiper = (
  family: Family,
  props: Props,
  use: MachineUse,
  around: SwipeAround,
) => LayerSwipe

/** A layer that does not swipe: nothing laid over its part, and no state. */
export const useStill: Swiper = (family, props, use, { node }) => {
  const edge = said(family, props, use, 'edge', node)
  return {
    binding: {},
    edge: typeof edge === 'string' && EDGES.includes(edge) ? (edge as Edge) : undefined,
    states: {},
  }
}

/** Swipes a layer whose node says `swipe`. */
export const useLayerSwipe: Swiper = (family, props, use, { dismiss, node, open, sheet }) => {
  const written = said(family, props, use, 'edge', node)
  const edge: Edge =
    typeof written === 'string' && EDGES.includes(written) ? (written as Edge) : 'bottom'
  const along = sheet ? 'bottom' : edge
  const enabled = said(family, props, use, 'swipe', node) !== false
  const window = useWindowDimensions()
  const swiping = useSwipe({
    edge: swipeEdge(along, direction() === 'rtl'),
    enabled,
    open,
    points: said(family, props, use, 'snap', node),
    settle: (shown) => shown !== 0 || dismiss(),
  })
  const wrap = (view: ReactNode) => (
    <GestureDetector gesture={swiping.gesture}>
      <Animated.View collapsable={false} onLayout={swiping.measure} style={swiping.style}>
        {view}
      </Animated.View>
    </GestureDetector>
  )
  const reveal = (view: unknown) => {
    const measures = view as { measureInWindow?: (done: (...box: number[]) => void) => void }
    if (swiping.shown >= 1 || measures?.measureInWindow === undefined) {
      return
    }
    measures.measureInWindow((x = 0, y = 0, width = 0, height = 0) => {
      if (beyond({ height, width, x, y }, window)) {
        swiping.whole()
      }
    })
  }
  return {
    binding: { wrap },
    edge,
    reveal,
    scroller: enabled ? swiping.scroller : undefined,
    states: { snapped: open && swiping.shown < 1 },
  }
}
