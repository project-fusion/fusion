/*
 * What the map events carry: the shape of each one's `detail`.
 *
 * Types only, so this module is empty at runtime.
 */

import type { ViewportPanDetail, ViewportZoomDetail } from '@fusion.dev/helix-core'

/** What `ViewportPanDetail` was called when only Map had one. */
export type MapPanDetail = ViewportPanDetail

/** What `ViewportZoomDetail` was called when only Map had one. */
export type MapZoomDetail = ViewportZoomDetail

/** A rotate request: turn by some degrees, or turn to a bearing. */
export interface MapRotateDetail {
  /** Degrees to turn the map clockwise. Negative turns it counterclockwise. */
  by?: number
  /** The bearing to turn the map to, in degrees clockwise from north. `0` faces north. */
  to?: number
}

/** A tilt request, in degrees. */
export interface MapTiltDetail {
  /** Degrees to tilt the map toward the horizon. Negative tilts it back toward flat. */
  by?: number
  /** The tilt to go to, in degrees from looking straight down. `0` is flat. */
  to?: number
}

/** What changed on a part of a map: a line or a shape, or something standing on a place. */
export interface MapPartChangeDetail {
  /**
   * `layer` for a route or an area, which is redrawn; `place` for a marker or
   * a position, which is moved; `cluster` for a marker gathered into another
   * or let go, which moves the frame's tab stop; `menu` for the frame's layers
   * menu opening, which asks for its map-type previews; `gestures` for which
   * gestures the map takes, which the renderer is told.
   */
  kind: 'cluster' | 'gestures' | 'layer' | 'menu' | 'place'
}

/** What a cluster a reader pressed holds. */
export interface MapClusterDetail {
  /**
   * A points layer's count, as the connector keyed it, where the cluster is
   * one the renderer drew rather than one of markers.
   */
  key?: string | undefined
  /** The names of the places it stands for, the one it is drawn as first, where they are known. */
  labels: string[]
}
