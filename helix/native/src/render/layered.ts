/**
 * What a layer's machine gives the drawing of its layer, and the stops of
 * keyboard focus a layer holds, which each press drawn inside it joins.
 */
import { createContext, useContext } from 'react'
import type { SwipeScroller } from '../drivers/swipe'
import type { Viewport } from '../style/context'

/** One control inside a layer, as it joins: the view focus moves to, and whether it is disabled now. */
export interface LayerStop {
  readonly disabled: () => boolean
  readonly node: () => unknown
}

/** The controls inside a layer, in the order they join, which its focus scope moves among. */
export interface LayerStops {
  readonly join: (key: object, stop: LayerStop) => void
  readonly leave: (key: object) => void
}

/**
 * The controls of the layer around a press, which the press joins as its
 * view is drawn. Nothing outside a layer gives one.
 */
export const LayerStopsContext = createContext<LayerStops | undefined>(undefined)

/** The controls of the layer around, or `undefined` outside one. */
export const useLayerStops = (): LayerStops | undefined => useContext(LayerStopsContext)

/** Where an anchored layer stands in the host, in points from its top and its left. */
export interface LayerAt {
  readonly left: number
  readonly top: number
}

/** What a layer's machine gives the drawing of its layer, at one render. */
export interface Layered {
  /** Whether the layer is placed against an anchor. */
  readonly anchored: boolean
  /** Where an anchored layer stands, once it is placed. Absent while it is measured. */
  readonly at?: LayerAt
  /**
   * Whether it is a band, under its anchor across the whole window, as a
   * megamenu's band is: the host draws it as wide as the window at `at`.
   */
  readonly band?: boolean
  /** Asks to dismiss the layer, as a press on its scrim does. */
  readonly backdrop: () => void
  /** Takes the layer's largest corner radius as its rules draw it, which its arrow keeps from each end. */
  readonly corner: (radius: number) => void
  /**
   * The edge of the window the layer stands along, as a drawer does, where
   * its node names one: the host draws it against that edge.
   */
  readonly edge?: 'bottom' | 'end' | 'start' | 'top'
  /**
   * Whether it is a look alone, as a tour's spotlight: drawn under every
   * other layer, and taking no touch, no key, and no focus.
   */
  readonly decorative?: boolean
  /** Hands over the view an anchored layer is placed by, which Floating UI measures. */
  readonly floating: (node: unknown) => void
  /** What the host knows the layer by. */
  readonly key: object
  /** The lengths the layer measures, by name: the room it has left, and its anchor's width. */
  readonly measured: Readonly<Record<string, number>>
  /** Whether it holds the reader now: a modal layer that stands open. */
  readonly modal: boolean
  /**
   * Whether it is a notice, drawn above every other layer and read and
   * pressable while a modal one holds the reader, as a toast's stack is.
   */
  readonly notice?: boolean
  /** Whether it stands open. It is drawn through its exit after it closes. */
  readonly open: boolean
  /**
   * Ends the answer to a press outside that the layer kept open, once the
   * motion its rules give it then has run: present only while the layer is
   * `data-refused`.
   */
  readonly refused?: () => void
  /** Hears a touch that starts on the app outside every layer, where such a touch dismisses it. */
  readonly outside?: (x: number, y: number) => void
  /** What a scroller inside a layer that swipes takes, so the swipe hears its drag. */
  readonly scroller?: SwipeScroller
  /** Whether it is drawn as a sheet along the window's bottom edge, placed by no anchor. */
  readonly sheet: boolean
  /** The controls inside it, which presses join. */
  readonly stops: LayerStops
  /** The window it is placed in, which its viewport lengths and its `window` rules read. */
  readonly viewport: Viewport
}

/**
 * What a scroller inside a layer that swipes takes, so the swipe hears its
 * drag and holds it at its start while the layer moves. Nothing outside such
 * a layer gives one.
 */
export const SwipeScrollerContext = createContext<SwipeScroller | undefined>(undefined)

/** What a scroller inside a swiping layer takes, or `undefined` elsewhere. */
export const useSwipeScroller = (): SwipeScroller | undefined => useContext(SwipeScrollerContext)
