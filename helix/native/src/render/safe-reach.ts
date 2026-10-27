/**
 * The safe area an element's host reads where it is no layer, as an app
 * header at the top of the window stands clear of the status bar and the
 * notch: the share of each of the window's insets that reaches into the
 * host, measured where the host stands in the window.
 */
import { NO_INSETS } from '@fusion.dev/helix-core/capabilities/environment'
import type { Insets } from '@fusion.dev/helix-core/capabilities/types'
import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { type HostInstance, type LayoutChangeEvent, useWindowDimensions } from 'react-native'
import { scrollViewAbove } from '../capabilities/scroll'
import { useLayerHost } from '../root/layers'
import type { Viewport } from '../style/context'
import type { Family } from '../style/form'
import { bothRefs } from './behavior'

/** A box in the window, in points. */
interface Box {
  readonly height: number
  readonly width: number
  readonly x: number
  readonly y: number
}

/** `value`, kept between `least` and `most`. */
const clamp = (value: number, least: number, most: number): number =>
  Math.min(most, Math.max(least, value))

/**
 * Whether `family`'s rules on its host read the safe area, which only a
 * layer's other parts may, as `helix system build` holds them.
 */
export const readsSafeArea = (family: Family): boolean =>
  (family.rules ?? []).some(
    (item) =>
      item.kind === 'rule' &&
      item.target === 'host' &&
      item.slotted === undefined &&
      JSON.stringify(item.set).includes('safe-area-inset-'),
  )

/**
 * The share of each of the window's `insets` that reaches into `box`: the
 * status bar's height for a box at the top of the window, less where the
 * box stands lower, and none for a box below it. **A box measured from its
 * own top and its own start** keeps the same reach as it pads itself.
 */
export const reachOf = (
  insets: Insets,
  box: Box,
  window: { readonly height: number; readonly width: number },
): Insets => ({
  bottom: clamp(box.y + box.height - (window.height - insets.bottom), 0, insets.bottom),
  left: clamp(insets.left - box.x, 0, insets.left),
  right: clamp(box.x + box.width - (window.width - insets.right), 0, insets.right),
  top: clamp(insets.top - box.y, 0, insets.top),
})

/** Where a host reads no safe area: nowhere, as a box that is in no scroll view. */
const NOWHERE: Box = {
  height: 0,
  width: 0,
  x: Number.POSITIVE_INFINITY,
  y: Number.POSITIVE_INFINITY,
}

/**
 * The box a laid-out view has in the window, where its host instance can say.
 * **A view inside a scroll view reads no safe area**, as it moves under the
 * status bar and out again as the view scrolls, which lays nothing out.
 */
const boxOf = (node: unknown): Box | undefined => {
  const view = node as { readonly getBoundingClientRect?: () => Box } | null
  if (view !== null && scrollViewAbove(view as unknown as HostInstance) !== null) {
    return NOWHERE
  }
  const box = view?.getBoundingClientRect?.()
  return box === undefined
    ? undefined
    : { height: box.height, width: box.width, x: box.x, y: box.y }
}

/** Whether two boxes stand in one place at one size. */
const same = (one: Box | undefined, other: Box): boolean =>
  one !== undefined &&
  one.x === other.x &&
  one.y === other.y &&
  one.width === other.width &&
  one.height === other.height

/**
 * The window a host that reads the safe area is drawn in, with the reach of
 * each inset into it, what measures where it stands as it is laid out, and
 * the ref its view takes. Nothing for a host that does not read it.
 *
 * **The first frame is drawn at the reach already**: the view is measured
 * where it stands once it is laid out, before it is drawn, so an app header
 * opened at the top of the window is never drawn under the status bar. A
 * view is measured again each time it is laid out.
 */
export const useSafeReach = (
  reads: boolean,
): {
  readonly context: { readonly viewport?: Viewport }
  readonly measure?: (event: LayoutChangeEvent) => void
  /** The host's view props with a ref that measures the view before it is first drawn. */
  readonly placed: (props: Readonly<Record<string, unknown>>) => Readonly<Record<string, unknown>>
} => {
  const host = useLayerHost()
  const window = useWindowDimensions()
  const [box, setBox] = useState<Box | undefined>(undefined)
  const view = useRef<unknown>(null)
  const hold = useCallback((node: unknown) => {
    view.current = node
  }, [])
  const take = useCallback((next: Box | undefined) => {
    setBox((was) => (next === undefined || same(was, next) ? was : next))
  }, [])
  const measure = useCallback(
    (event: LayoutChangeEvent) => take(boxOf(event.currentTarget)),
    [take],
  )
  useLayoutEffect(() => {
    if (reads && box === undefined && view.current !== null) {
      take(boxOf(view.current))
    }
  })
  if (!reads) {
    return { context: {}, placed: (props) => props }
  }
  const insets = box === undefined ? NO_INSETS : reachOf(host?.insets ?? NO_INSETS, box, window)
  return {
    context: {
      viewport: { height: window.height, insets, tall: window.height, width: window.width },
    },
    measure,
    placed: (props) => {
      const own = props.ref
      return {
        ...props,
        ref: typeof own === 'function' ? bothRefs(own as (node: unknown) => void, hold) : hold,
      }
    },
  }
}
