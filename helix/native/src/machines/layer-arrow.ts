/**
 * A layer's arrow: the part inside it that points at its anchor, which
 * Floating UI places along the edge that faces the anchor, as the web's
 * floating controller places the web's.
 *
 * **The arrow stands where core's `arrowEdges` says**: its center on the
 * edge facing the anchor, and along that edge over the anchor, kept the
 * layer's largest corner radius from either end, so it never meets a curve.
 * The edges it is not placed by are left unset, as the web writes them
 * `auto`, so a rule that pins it to one edge stands down.
 */
import { useCallback, useMemo, useRef, useState } from 'react'
import type { LayoutChangeEvent } from 'react-native'
import type { PartBinding } from '../render/behavior'
import type { Placed, Pointer } from './layer-place'

/** An arrow's own box, as its rules size it. */
interface Box {
  readonly height: number
  readonly width: number
}

/** What a layer's arrow gives the machine that places it. */
export interface Arrowed {
  /** What the arrow's part is bound to, at the place it was given. */
  readonly binding: (placed: Placed) => PartBinding
  /** Takes the layer's largest corner radius, which the arrow keeps from each end. */
  readonly corner: (radius: number) => void
  /** The arrow Floating UI places, or none where the layer names no arrow. */
  readonly pointer: Pointer | undefined
}

/** The edges an arrow may be placed by. */
const EDGES = ['bottom', 'left', 'right', 'top'] as const

/**
 * The arrow of a layer that names `part` as its arrow, or a layer with no
 * arrow where `part` is `undefined`.
 */
export const useArrow = (part: string | undefined): Arrowed => {
  const node = useRef<unknown>(null)
  const radius = useRef(0)
  const [box, setBox] = useState<Box | undefined>(undefined)
  const ref = useCallback((handed: unknown) => {
    node.current = handed
  }, [])
  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const { height, width } = event.nativeEvent.layout
    setBox((now) => (now?.height === height && now.width === width ? now : { height, width }))
  }, [])
  const corner = useCallback((given: number) => {
    radius.current = given
  }, [])
  const pointer = useMemo<Pointer | undefined>(
    () =>
      part === undefined
        ? undefined
        : { box: () => box, node: () => node.current, padding: () => radius.current },
    [box, part],
  )
  const binding = useCallback(
    (placed: Placed): PartBinding => {
      const edges = placed.arrow
      const style =
        edges === undefined
          ? {}
          : {
              position: 'absolute' as const,
              ...Object.fromEntries(EDGES.map((edge) => [edge, edges[edge]])),
            }
      return { view: { collapsable: false, onLayout, ref, style } }
    },
    [onLayout, ref],
  )
  return { binding, corner, pointer }
}

/** The largest corner radius a resolved style gives, in points, which an arrow keeps from each end. */
export const cornerOf = (style: Readonly<Record<string, unknown>>): number =>
  Math.max(
    0,
    ...[
      'borderRadius',
      'borderTopLeftRadius',
      'borderTopRightRadius',
      'borderBottomLeftRadius',
      'borderBottomRightRadius',
      'borderTopStartRadius',
      'borderTopEndRadius',
      'borderBottomStartRadius',
      'borderBottomEndRadius',
    ].map((name) => {
      const value = style[name]
      return typeof value === 'number' && Number.isFinite(value) ? value : 0
    }),
  )
