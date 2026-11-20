/**
 * The arithmetic of a layer, which needs nothing of React Native: the
 * placement it asks for, the room it keeps from the window's edges, how a
 * reader may dismiss it, and where Tab takes focus inside it. The side it
 * lands on and the lengths it tells its rules are core's, from
 * `@fusion.dev/helix-core/layers`, as the web's floating controller reads
 * them.
 */

import type { LayerSide } from '@fusion.dev/helix-core/layers'

/** A side of the anchor a layer lands on. */
export type Side = LayerSide

/** A side and an end, as Floating UI names a placement. */
export type Placement = `${Side}` | `${Side}-${'end' | 'start'}`

/** How a reader may dismiss a layer, as `<dialog closedby>` names it. */
export type ClosedBy = 'any' | 'closerequest' | 'none'

/** How far from each edge of the window a layer keeps, in points, as the web's does. */
export const MARGIN = 8

/** The placement a layer asks for, `bottom-start` where it names none or one Floating UI does not know. */
export const placementOf = (asked: unknown): Placement => {
  const known = /^(bottom|left|right|top)(-(start|end))?$/
  return typeof asked === 'string' && known.test(asked) ? (asked as Placement) : 'bottom-start'
}

/**
 * The room a layer keeps from each edge of the window: the margin, and the
 * keyboard's height at the bottom while it shows.
 */
export const paddingFor = (keyboard: number) => ({
  bottom: MARGIN + keyboard,
  left: MARGIN,
  right: MARGIN,
  top: MARGIN,
})

/** A box Floating UI measures, in points from the window's left and top. */
export interface Rect {
  readonly height: number
  readonly width: number
  readonly x: number
  readonly y: number
}

/**
 * How far the anchor Floating UI measured is off from the frame the layer is
 * placed in, in points: the host's own place in the window, and on Android
 * the status bar's height, which `@floating-ui/react-native` adds to every
 * anchor it measures in the window.
 *
 * **React Native measures from the root view's top on both platforms.**
 * Fabric's `measureInWindow` adds the root view's viewport offset, which
 * Android takes as the root's place in the window less the status bar and
 * the cutout where the app is not edge to edge, and as the root's place,
 * the window's top, where it is: either way the root view's frame, which
 * the host draws in. Floating UI adds the status bar again, written for the
 * older measure, so each layer on Android stood one status bar too low.
 */
export const anchorOffset = (
  host: { readonly x: number; readonly y: number },
  statusBarAdded: number,
): { readonly x: number; readonly y: number } => ({ x: host.x, y: host.y + statusBarAdded })

/** `rect` moved back by `offset`, into the frame the layer is placed in. */
export const shifted = (rect: Rect, offset: { readonly x: number; readonly y: number }): Rect => ({
  ...rect,
  x: rect.x - offset.x,
  y: rect.y - offset.y,
})

/** How a reader may dismiss a layer: as it says, or by its default for a modal layer or another. */
export const closedByOf = (asked: unknown, modal: boolean): ClosedBy =>
  asked === 'any' || asked === 'closerequest' || asked === 'none'
    ? asked
    : modal
      ? 'closerequest'
      : 'any'

/**
 * Whether a dismissal of the kind `by` dismisses a layer that `closedBy`
 * says may be dismissed so: a press outside under `any`, a close request
 * under `any` and `closerequest`, and a swipe out through the layer's edge
 * under either, as the web's drawer refuses a swipe only where it refuses
 * every way out.
 */
export const dismisses = (closedBy: ClosedBy, by: 'outside' | 'request' | 'swipe'): boolean =>
  closedBy === 'any' || (closedBy === 'closerequest' && by !== 'outside')

/**
 * Where Tab takes focus among `count` stops from the stop at `at`, or from
 * none where `at` is -1: on, or back with Shift, round at each end. -1 where
 * there is no stop.
 */
export const tabbed = (count: number, at: number, back: boolean): number => {
  if (count === 0) {
    return -1
  }
  if (at === -1) {
    return back ? count - 1 : 0
  }
  return back ? (at - 1 + count) % count : (at + 1) % count
}

/** Whether a point in the window stands inside a box measured in the window, `[x, y, width, height]`. */
export const inside = (
  box: readonly [number, number, number, number] | undefined,
  x: number,
  y: number,
): boolean =>
  box !== undefined && x >= box[0] && x <= box[0] + box[2] && y >= box[1] && y <= box[1] + box[3]

/**
 * Whether a box reaches past the window's edges by more than a point, as the
 * web's drawer asks of a control focus moved to while it rests short of the
 * whole.
 */
export const beyond = (
  box: { readonly height: number; readonly width: number; readonly x: number; readonly y: number },
  window: { readonly height: number; readonly width: number },
): boolean =>
  box.y < -1 ||
  box.x < -1 ||
  box.y + box.height > window.height + 1 ||
  box.x + box.width > window.width + 1
