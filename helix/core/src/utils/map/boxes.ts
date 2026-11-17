/*
 * The boxes a still map keeps its place names clear of, found by the cells
 * of a grid over the view that they cover.
 */

import type { MapView } from './camera.js'

/** A box on the screen in pixels: left, top, right and bottom. */
export type PlaceNameBox = readonly [number, number, number, number]

/** Whether two boxes overlap, a shared edge not counted. */
export const overlaps = (a: PlaceNameBox, b: PlaceNameBox): boolean =>
  a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3]

/** The side of a cell of the grid boxes are found by, in pixels. */
const CELL = 64

/**
 * Boxes found by the cells of a grid over the view that they cover, so a
 * name is held only against the boxes near it: a points layer draws
 * thousands of dots. A box is clipped to the view, where every name is.
 */
export const gridOf = (view: MapView) => {
  const cells = new Map<number, PlaceNameBox[]>()
  const across = Math.ceil(view.width / CELL) + 1
  const rangeOf = (box: PlaceNameBox) => {
    const cell = (at: number, most: number) =>
      Math.min(Math.max(Math.floor(at / CELL), 0), Math.ceil(most / CELL))
    return [
      cell(box[0], view.width),
      cell(box[1], view.height),
      cell(box[2], view.width),
      cell(box[3], view.height),
    ] as const
  }
  return {
    add: (box: PlaceNameBox) => {
      const [x0, y0, x1, y1] = rangeOf(box)
      for (let y = y0; y <= y1; y += 1) {
        for (let x = x0; x <= x1; x += 1) {
          const key = y * across + x
          const held = cells.get(key)
          if (held === undefined) {
            cells.set(key, [box])
          } else {
            held.push(box)
          }
        }
      }
    },
    hits: (box: PlaceNameBox): boolean => {
      const [x0, y0, x1, y1] = rangeOf(box)
      for (let y = y0; y <= y1; y += 1) {
        for (let x = x0; x <= x1; x += 1) {
          if (cells.get(y * across + x)?.some((other) => overlaps(other, box))) {
            return true
          }
        }
      }
      return false
    },
  }
}
