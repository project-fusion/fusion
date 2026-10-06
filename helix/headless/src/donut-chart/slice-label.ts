/*
 * Where a Donut Chart writes a slice's share, as arithmetic with no element
 * in it.
 *
 * Pure and beside the family's `index.ts`, because where the middle of a
 * slice falls is a fact about angles, and a spec can hold it without a page.
 */

/** A slice's place on the ring, as shares of the whole from 0 to 1. */
export interface SliceShare {
  /** How much of the ring the slice takes. */
  fraction: number
  /** Where the slice starts, as the share of the ring before it. */
  start: number
}

/** The ring a slice label is placed on, in the drawing's own units. */
export interface RingGeometry {
  /** The center, on both axes. */
  center: number
  /** Where the ring's turn starts, in radians: a quarter turn back is twelve o'clock. */
  origin: number
  /** The radius of the band's middle, where a label sits. */
  radius: number
  /** How much of a turn the ring takes: 1 for a ring, a half for an arc. */
  span: number
  /** How tall the box the labels are placed in is. */
  tall: number
  /** Where the top of that box is. */
  top: number
  /** How wide the drawing is. */
  width: number
}

/** The smallest share that takes a label: a twentieth of the ring. */
export const SMALLEST_LABELED = 0.05

/**
 * Where a slice's label goes, as percentages of the box from the left and the
 * top: the middle of its band at its mid-angle. Nothing for a slice under a
 * twentieth, whose label would not fit on it.
 */
export const sliceLabelAt = (
  share: SliceShare,
  ring: RingGeometry,
): { x: number; y: number } | undefined => {
  if (share.fraction < SMALLEST_LABELED) {
    return undefined
  }
  const angle = (share.start + share.fraction / 2) * 2 * Math.PI * ring.span + ring.origin
  return {
    x: ((ring.center + Math.cos(angle) * ring.radius) / ring.width) * 100,
    y: ((ring.center + Math.sin(angle) * ring.radius - ring.top) / ring.tall) * 100,
  }
}
