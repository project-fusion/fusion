/**
 * Where a layer stands against its anchor, as `@floating-ui/react-native`
 * places it: on the side it asks for, turned to the other side where that
 * one has no room, slid along to stay in the window, and told the room it
 * has left, its anchor's width, and where its arrow points.
 *
 * **Floating UI places it, as it places the web's.** The web's layers run
 * `@floating-ui/dom` through core's floating controller, with the same
 * margin of 8 points from the window's edges, so a popover lands on the
 * same side on both platforms, and its arrow stands where core's
 * `arrowEdges` puts the web's.
 *
 * **What moves the anchor moves the layer.** Floating UI's React Native
 * package measures only when asked, and an anchor in a scroll view moves
 * with no event a layer hears, so while an anchored layer is open its
 * anchor is measured each frame and the layer placed again whenever the
 * anchor has moved or changed size. A turn of the phone, and the software
 * keyboard showing or hiding, place it again too: the keyboard's height is
 * room the layer does not have.
 */
import {
  alignmentOf,
  arrowCenter,
  arrowEdges,
  measuredOf,
  reachOf,
  sideOf,
} from '@fusion.dev/helix-core/layers'
import { useEffect, useMemo, useRef } from 'react'
import { Platform, StatusBar, useWindowDimensions } from 'react-native'
import { peerError } from '../peers'
import type { LayerAt } from '../render/layered'
import { anchorOffset, type Placement, paddingFor, type Rect, type Side, shifted } from './layering'

export { MARGIN, type Placement, placementOf, type Side } from './layering'

/** The part of `@floating-ui/react-native` a layer uses. */
type Floating = typeof import('@floating-ui/react-native')

/**
 * Floating UI's package, an optional peer, loaded the first time an anchored
 * layer asks. **An app that draws no anchored layer does without it**, and
 * one that does is told to install it.
 */
let loaded: Floating | null | undefined

const floatingUi = (): Floating => {
  if (loaded === undefined) {
    try {
      loaded = require('@floating-ui/react-native') as Floating
    } catch {
      loaded = null
    }
  }
  if (loaded === null) {
    throw peerError(['@floating-ui/react-native'])
  }
  return loaded
}

/** A view Floating UI measures, as React Native's host instances are. */
interface Measured {
  readonly measureInWindow?: (
    done: (x: number, y: number, width: number, height: number) => void,
  ) => void
}

/** A point in the window, in points. */
interface Point {
  readonly x: number
  readonly y: number
}

/** The arrow a layer points at its anchor with. */
export interface Pointer {
  /** Its own box, once it is laid out. */
  readonly box: () => { readonly height: number; readonly width: number } | undefined
  /** Its view, which Floating UI measures. */
  readonly node: () => unknown
  /** How far it keeps from the layer's ends: the layer's largest corner radius. */
  readonly padding: () => number
}

/** What a layer asks to be placed by. */
export interface PlaceAsked {
  /** Whether it is placed now: open, and drawn as a popover. */
  readonly active: boolean
  /** The arrow it points with, where it has one. */
  readonly arrow?: Pointer
  /**
   * How far it slides along the side it stands on, in points: to the right
   * on the top or the bottom, and down on the left or the right.
   */
  readonly crossOffset?: number
  /** Whether it turns to the other side where its own has no room. It does unless this is false. */
  readonly flip?: boolean
  /** How tall the software keyboard stands over the host, in points. */
  readonly keyboard: number
  /** Its distance from the anchor, in points, less the arrow's reach. */
  readonly offset: number
  /** Where the host stands in the window, in points. */
  readonly origin: Point
  /** The side and the end it asks for. */
  readonly placement: Placement
}

/** What a placed layer gives its drawing and its states. */
export interface Placed {
  /** The end of its side it is aligned to, once it is placed. */
  readonly aligned?: 'end' | 'start'
  /** Where its arrow stands in it, by each physical edge, once it is placed. */
  readonly arrow?: Partial<Record<Side, number>>
  /** Where it stands, once Floating UI has placed it. */
  readonly at?: LayerAt
  /** Hands over the view the layer is placed by. */
  readonly floating: (node: unknown) => void
  /** The lengths it tells its rules. Empty until it is placed. */
  readonly measured: Readonly<Record<string, number>>
  /** Hands over the anchor's view. */
  readonly reference: (node: unknown) => void
  /** The side it landed on, once it is placed. */
  readonly side?: Side
}

/** Nothing placed: what a layer with no anchor gives. */
const UNPLACED: Placed = { floating: () => undefined, measured: {}, reference: () => undefined }

/** Places a layer as `asked` says. */
export type Placer = (asked: PlaceAsked) => Placed

/**
 * How a layer is placed: against its anchor where it has one, and not at all
 * where it has none. **Chosen once for an element**, so Floating UI's hook
 * runs at every render of an anchored layer and at none of any other.
 */
export const placerFor = (anchored: boolean): Placer => (anchored ? usePlaced : unplaced)

/** A layer with no anchor, which stands where its rules put it in the window. */
const unplaced: Placer = () => UNPLACED

/** What the origin middleware keeps between its runs. */
interface Corrected {
  readonly rects?: unknown
}

/**
 * A middleware, first in the list, that moves the anchor Floating UI measured
 * into the frame the layer is drawn in, as `anchorOffset` says, once for each
 * measure: a `reset` with the rects moved runs the rest again from them.
 */
export const fromOrigin = (offset: () => Point) => ({
  fn: (state: {
    readonly middlewareData: Readonly<Record<string, Corrected | undefined>>
    readonly rects: { readonly floating: Rect; readonly reference: Rect }
  }) => {
    const by = offset()
    if (state.middlewareData.helixOrigin?.rects === state.rects || (by.x === 0 && by.y === 0)) {
      return {}
    }
    const rects = { ...state.rects, reference: shifted(state.rects.reference, by) }
    return { data: { rects }, reset: { rects } }
  },
  name: 'helixOrigin',
})

/** Places a layer against its anchor. */
const usePlaced = ({
  active,
  arrow,
  crossOffset = 0,
  flip = true,
  keyboard,
  offset,
  origin,
  placement,
}: PlaceAsked): Placed => {
  const ui = floatingUi()
  const room = useRef<{ height: number; width: number; anchor: number } | undefined>(undefined)
  const padding = paddingFor(keyboard)
  const box = arrow?.box()
  const where = useRef(origin)
  where.current = origin
  const middleware = [
    fromOrigin(() =>
      anchorOffset(where.current, Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0),
    ),
    ui.offset({ crossAxis: crossOffset, mainAxis: offset + reachOf(box?.width ?? 0) }),
    /* A layer beside its anchor may leave for the axis across, below first,
       where neither side has room, as the web's floating controller lets it:
       a tour's first stop, `right-start` against a rail as wide as a phone,
       stood past the window's edge otherwise. */
    ...(flip
      ? [
          ui.flip(
            placement.startsWith('left') || placement.startsWith('right')
              ? { crossAxis: 'alignment', fallbackAxisSideDirection: 'end', padding }
              : { padding },
          ),
        ]
      : []),
    ui.shift({ padding }),
    ui.size({
      apply: ({ availableHeight, availableWidth, rects }) => {
        room.current = {
          anchor: rects.reference.width,
          height: availableHeight,
          width: availableWidth,
        }
      },
      padding,
    }),
    ...(arrow === undefined
      ? []
      : [ui.arrow(() => ({ element: arrow.node() as never, padding: arrow.padding() }))]),
  ]
  const {
    middlewareData,
    refs,
    placement: landed,
    update,
    x,
    y,
  } = ui.useFloating({
    middleware,
    placement,
    sameScrollView: false,
  })
  const window = useWindowDimensions()
  /* A turn of the phone places it again. */
  // biome-ignore lint/correctness/useExhaustiveDependencies: the window's size is what changed
  useEffect(() => {
    if (active) {
      update()
    }
  }, [active, update, window.width, window.height])
  /* The anchor, measured each frame while the layer is open. */
  useEffect(() => {
    if (!active) {
      room.current = undefined
      return undefined
    }
    let last = ''
    let frame = 0
    const look = () => {
      const anchor = refs.reference.current as Measured | null
      anchor?.measureInWindow?.((left, top, width, height) => {
        const now = `${left},${top},${width},${height}`
        if (now !== last) {
          last = now
          update()
        }
      })
      frame = requestAnimationFrame(look)
    }
    frame = requestAnimationFrame(look)
    return () => cancelAnimationFrame(frame)
  }, [active, refs, update])
  const told = room.current
  const point = middlewareData?.arrow
  const aligned = alignmentOf(landed)
  return useMemo(() => {
    const pointed =
      point === undefined || box === undefined
        ? undefined
        : { center: arrowCenter(point, box), edges: arrowEdges(landed, point, box) }
    return {
      floating: refs.setFloating as (node: unknown) => void,
      reference: refs.setReference as (node: unknown) => void,
      ...(told === undefined
        ? { measured: {} }
        : {
            ...(aligned === undefined ? {} : { aligned }),
            ...(pointed === undefined ? {} : { arrow: pointed.edges }),
            at: { left: x, top: y },
            measured: measuredOf(told, told.anchor, pointed?.center),
            side: sideOf(landed),
          }),
    }
  }, [aligned, box, landed, point, refs, told, x, y])
}
