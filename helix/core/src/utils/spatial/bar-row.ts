/**
 * A 3D bar chart's row: the places on its floor and the names written under
 * them, kept apart from the bars themselves.
 */

import type { PagePoint, Projection } from '../projection/projection.js'
import { pathData } from '../projection/projection.js'
import { type BarCell, type BarField, type BarLayout, placesOf } from './bars.js'
import { inBox } from './box.js'

/** How much of its place on the floor a row's plate covers along each edge: more than its bar, so the plate shows round the bar's foot. */
const PLATE = 0.85

/** One place on the floor of a row, under a bar or where a bar would stand. */
export interface FloorPlate {
  /** Which category it stands under, counting from zero. */
  across: number
  /** Its four corners on the page. */
  corners: PagePoint[]
  /** Its outline, as path data. */
  d: string
  /** Its corner lowest on the page, nearest the reader, which its name is written under. */
  front: PagePoint
}

/**
 * The cells of `field` that are its table's own, each with the category it
 * stands under: on a field drawn between two tables, the cells it adds for
 * bars that are shrinking away follow them, and are left out. A cell's
 * category is its place in the grid, which on a field between two holds
 * while the cell slides along the floor.
 */
const ownCells = (field: BarField): Array<{ across: number; cell: BarCell }> =>
  field.cells
    .slice(0, field.categories.length * Math.max(field.series.length, 1))
    .map((cell, index) => ({ across: Math.floor(index / Math.max(field.series.length, 1)), cell }))

/**
 * The places on the floor of a row, one for each category in each lane,
 * whether a bar stands there or not: a square a little wider than a bar's
 * footprint, turned as the bars are, where zero stands on the value axis,
 * along the row `layout` lays. Between two tables, each place slides with
 * its bar.
 */
export const floorOf = (
  field: BarField,
  projection: Projection,
  layout: Exclude<BarLayout, 'grid'> = 'row',
): FloorPlate[] => {
  const { place, spacing } = placesOf(field, projection, layout)
  const floor = inBox(field.axes.y, 0) * field.axes.extent[1]
  const half = (spacing * PLATE) / 2
  const seen = new Set<string>()
  return ownCells(field).flatMap(({ across, cell }): FloorPlate[] => {
    const key = `${across} ${cell.lane}`
    if (seen.has(key)) {
      return []
    }
    seen.add(key)
    const { x, y } = place(cell)
    const corners = [
      projection.at(x - half, y - half, floor),
      projection.at(x + half, y - half, floor),
      projection.at(x + half, y + half, floor),
      projection.at(x - half, y + half, floor),
    ]
    const front = corners.reduce((low, one) => (one.y > low.y ? one : low))
    return [{ across, corners, d: pathData(corners), front }]
  })
}

/** How wide a name is on the page, as a share of its size for each letter, near enough to keep names apart. */
const NAME_WIDE = 0.58

/** A category's name written under its place in a row. */
export interface RowName {
  across: number
  text: string
  /** Whether a bar of its category names a tone, which colors the name. */
  tone?: string | undefined
  x: number
  /** The middle of the line of text. */
  y: number
}

/**
 * The names written under a row's plates, `size` tall: each category's name
 * under its plate nearest the reader, **and only the names that fit**, so
 * none overlaps another. A name whose bar names a tone is written first,
 * then every other name, or every second, third, and so on, at the smallest
 * even step that fits, leaving out a name the toned one covers.
 */
export const namesOf = (
  field: BarField,
  plates: readonly FloorPlate[],
  size: number,
): RowName[] => {
  const fronts = new Map<number, PagePoint>()
  for (const plate of plates) {
    const kept = fronts.get(plate.across)
    if (!kept || plate.front.y > kept.y) {
      fronts.set(plate.across, plate.front)
    }
  }
  const tones = new Map<number, string>()
  for (const { across, cell } of ownCells(field)) {
    if (cell.tone && cell.value !== undefined && !tones.has(across)) {
      tones.set(across, cell.tone)
    }
  }
  const all: RowName[] = field.categories.flatMap((text, across): RowName[] => {
    const front = fronts.get(across)
    return front
      ? [{ across, text, tone: tones.get(across), x: front.x, y: front.y + size * 1.1 }]
      : []
  })
  const room = (name: RowName): [number, number] => {
    const half = (name.text.length * size * NAME_WIDE) / 2 + size * 0.4
    return [name.x - half, name.x + half]
  }
  const clear = (one: RowName, kept: readonly RowName[]): boolean => {
    const [from, to] = room(one)
    return kept.every((other) => {
      const [left, right] = room(other)
      return to <= left || from >= right
    })
  }
  const toned = all.filter((name) => name.tone)
  const rest = all.filter((name) => !name.tone)
  /* Every name, or every second, third, and so on, the fewest left out that
     keeps an even step. A name the toned one covers is left out alone. */
  for (let step = 1; step <= Math.max(1, all.length); step++) {
    const kept = toned.filter((name, at) => clear(name, toned.slice(0, at)))
    let fits = true
    for (const name of rest) {
      if (name.across % step !== 0) {
        continue
      }
      if (clear(name, kept)) {
        kept.push(name)
      } else if (
        !clear(
          name,
          kept.filter((one) => one.tone),
        )
      ) {
      } else {
        fits = false
        break
      }
    }
    if (fits) {
      return kept.sort((one, other) => one.across - other.across)
    }
  }
  return []
}
