/**
 * A 3D bar chart's row: the places on its floor, the names written under
 * them, and how its bars grow in, kept apart from the bars themselves.
 */

import type { PagePoint, Projection } from '../projection/projection.js'
import { pathData } from '../projection/projection.js'
import { type BarField, type BarLayout, placesOf } from './bars.js'
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
 * The places on the floor of a row, one for each category in each lane,
 * whether a bar stands there or not: a square a little wider than a bar's
 * footprint, turned as the bars are, where zero stands on the value axis,
 * along the row `layout` lays.
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
  return field.cells.flatMap((cell): FloorPlate[] => {
    const key = `${cell.across} ${cell.lane}`
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
    return [{ across: cell.across, corners, d: pathData(corners), front }]
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
  for (const cell of field.cells) {
    if (cell.tone && cell.value !== undefined && !tones.has(cell.across)) {
      tones.set(cell.across, cell.tone)
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

/** How long one bar takes to grow in, in milliseconds. */
const GROW = 1000

/** How long each bar waits after the one before it, and the longest the last one waits. */
const STAGGER = 110
const SPREAD = 660

/** The wait between one category's bars and the next one's, as they grow in. */
const stepOf = (categories: number): number =>
  categories > 1 ? Math.min(STAGGER, SPREAD / (categories - 1)) : 0

/**
 * How much of its height a bar of category `across` has reached `elapsed`
 * milliseconds after the bars began to grow in, from 0 to 1. **In reading
 * order**, each category a little after the one before it, and fast at first
 * and slow to rest, never past its value.
 */
export const grownAt = (across: number, categories: number, elapsed: number): number => {
  const t = (elapsed - across * stepOf(categories)) / GROW
  if (t <= 0) {
    return 0
  }
  return t >= 1 ? 1 : 1 - (1 - t) ** 3
}

/** How long the bars of `categories` take to grow in, the last one included, in milliseconds. */
export const growTime = (categories: number): number =>
  GROW + stepOf(categories) * Math.max(0, categories - 1)
