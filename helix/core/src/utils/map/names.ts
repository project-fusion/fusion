/*
 * The place names a still map draws from its vector tiles: the cities,
 * towns, villages and neighborhoods of the OpenMapTiles `place` layer, each
 * sized as the style's layer of the same `id` sizes it, placed in the
 * style's order of importance, and left out where it would overlap a name
 * already placed. A phone's still picture draws them, where MapLibre Native
 * is not in the app to place the style's own labels.
 */

import type { MapView, ScreenPoint } from './camera.js'
import type { SnapshotTiles } from './snapshot.js'
import type { TileLayer } from './tile.js'

/**
 * One kind of place name, **the same as `mapLibreStyle`'s layer of the same
 * `id`**: its classes, the zoom it starts at, its size between two zooms,
 * and how far the land is moved toward the ink for it.
 */
export interface PlaceNameLayer {
  /** How far the land is moved toward the ink, from 0 to 1, before the contrast target. */
  amount: number
  /** The `place` features' classes it names. */
  classes: readonly string[]
  id: string
  /** The space added between letters, in ems. */
  letterSpacing?: number
  /** The zoom it starts at. */
  minzoom: number
  /** Its size at two zooms, in pixels, linear between them. */
  size: readonly [readonly [number, number], readonly [number, number]]
  /** Whether it is written in capitals. */
  uppercase?: boolean
  weight: 'bold' | 'medium' | 'regular'
}

/**
 * The place names a still map draws, **the most important first**, which
 * is the order they are placed in: the style stacks the cities over the
 * towns, the towns over the neighborhoods, and those over the villages, and
 * MapLibre places the top of the stack first.
 */
export const PLACE_NAME_LAYERS: readonly PlaceNameLayer[] = [
  {
    amount: 0.88,
    classes: ['city'],
    id: 'label-city',
    minzoom: 4,
    size: [
      [4, 11],
      [14, 20],
    ],
    weight: 'bold',
  },
  {
    amount: 0.75,
    classes: ['town'],
    id: 'label-town',
    minzoom: 8,
    size: [
      [8, 11],
      [16, 16],
    ],
    weight: 'regular',
  },
  {
    amount: 0.55,
    classes: ['suburb', 'neighbourhood', 'quarter'],
    id: 'label-neighbourhood',
    letterSpacing: 0.12,
    minzoom: 11,
    size: [
      [11, 9],
      [16, 13],
    ],
    uppercase: true,
    weight: 'medium',
  },
  {
    amount: 0.65,
    classes: ['village', 'hamlet'],
    id: 'label-village',
    minzoom: 11,
    size: [
      [10, 10],
      [16, 14],
    ],
    weight: 'regular',
  },
]

/** A place name as a still map draws it: its lines, centered on its spot, and its box. */
export interface PlaceName {
  /** How far the land is moved toward the ink for it, as its layer says. */
  readonly amount: number
  /** Its layer's `id`. */
  readonly id: string
  /** The space between letters, in pixels. */
  readonly letterSpacing: number
  /** Its words, a line each, wrapped as the style wraps them. */
  readonly lines: readonly string[]
  /** Its size in pixels. */
  readonly size: number
  readonly weight: PlaceNameLayer['weight']
  /** Its middle on the screen. */
  readonly x: number
  readonly y: number
}

/** A size between two zooms as the style's `linear` interpolation draws it. */
export const placeNameSize = (layer: PlaceNameLayer, zoom: number): number => {
  const [[z0, s0], [z1, s1]] = layer.size
  const t = Math.min(Math.max((zoom - z0) / (z1 - z0), 0), 1)
  return s0 + t * (s1 - s0)
}

/** How wide the style lets a name run before it wraps, in ems: its `text-max-width`. */
const MOST_EMS = 8

/** The space kept clear round each name, in pixels: MapLibre's `text-padding`. */
const PADDING = 2

/** How tall a line is, in ems: MapLibre's `text-line-height`. */
const LINE = 1.2

/** The most names one view draws, the least important left out first. */
const MOST_NAMES = 80

/** How wide a letter is on average, in ems, by weight; capitals are wider. */
const LETTER: Readonly<Record<PlaceNameLayer['weight'], number>> = {
  bold: 0.6,
  medium: 0.57,
  regular: 0.54,
}

/** How wide words are drawn, in pixels: an estimate from their letters, which a phone draws in its own face. */
export const placeNameWidth = (
  words: string,
  size: number,
  weight: PlaceNameLayer['weight'],
  spacing: number,
  uppercase = false,
): number =>
  words.length * size * (LETTER[weight] + (uppercase ? 0.12 : 0)) +
  Math.max(words.length - 1, 0) * spacing

/** Words wrapped at the style's width, a word too long for a line kept whole on its own. */
const wrapped = (words: string, fits: (line: string) => boolean): string[] => {
  const lines: string[] = []
  let line = ''
  for (const word of words.split(/\s+/).filter((one) => one !== '')) {
    const longer = line === '' ? word : `${line} ${word}`
    if (line !== '' && !fits(longer)) {
      lines.push(line)
      line = word
    } else {
      line = longer
    }
  }
  if (line !== '') {
    lines.push(line)
  }
  return lines
}

/** A box on the screen in pixels: left, top, right and bottom. */
export type PlaceNameBox = readonly [number, number, number, number]

type Box = PlaceNameBox

const overlaps = (a: Box, b: Box): boolean =>
  a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3]

/** A name found in a tile, before it is placed. */
interface Found {
  readonly at: ScreenPoint
  readonly layer: PlaceNameLayer
  readonly order: number
  readonly rank: number
  readonly words: string
}

/**
 * A feature's name in `language`, or in its first part, as `en` for
 * `en-US`, then in Latin letters, then as the place writes it, as the
 * style's `coalesce` picks it.
 */
const nameOf = (properties: Readonly<Record<string, unknown>>, language: string): string => {
  const short = language.split('-')[0] ?? language
  for (const key of [`name:${language}`, `name:${short}`, 'name:latin', 'name']) {
    const value = properties[key]
    if (typeof value === 'string' && value.trim() !== '') {
      return value.trim()
    }
  }
  return ''
}

/**
 * The place names a view draws from the `place` layer of each tile:
 * **the most important placed first**, by the layers' order and then by
 * each place's `rank`, and each left out where its box, padded, would
 * overlap a name already placed, one of `taken`, such as the counts a
 * points layer draws, or run past the view's edge.
 */
export const placeNames = (
  tiles: SnapshotTiles,
  view: MapView,
  found: Iterable<readonly [readonly [number, number], TileLayer | undefined]>,
  language = 'en',
  taken: readonly PlaceNameBox[] = [],
): PlaceName[] => {
  const shown = PLACE_NAME_LAYERS.filter((layer) => view.zoom >= layer.minzoom)
  const { camera, span } = tiles
  const candidates: Found[] = []
  for (const [[tx, ty], layer] of found) {
    for (const feature of layer?.features ?? []) {
      const kind = String(feature.properties.class ?? '')
      const order = shown.findIndex((one) => one.classes.includes(kind))
      const point = feature.lines[0]?.[0]
      const words = nameOf(feature.properties, language)
      if (feature.type !== 1 || order === -1 || point === undefined || words === '') {
        continue
      }
      const extent = layer?.extent ?? 4096
      const at = camera.toScreen([(tx + point.x / extent) * span, (ty + point.y / extent) * span])
      if (at === undefined) {
        continue
      }
      const rank = Number(feature.properties.rank)
      candidates.push({
        at,
        layer: shown[order] as PlaceNameLayer,
        order,
        rank: Number.isFinite(rank) ? rank : Number.POSITIVE_INFINITY,
        words,
      })
    }
  }
  candidates.sort(
    (a, b) =>
      a.order - b.order ||
      a.rank - b.rank ||
      a.words.localeCompare(b.words) ||
      a.at[1] - b.at[1] ||
      a.at[0] - b.at[0],
  )
  const placed: { box: Box; name: PlaceName }[] = []
  for (const one of candidates) {
    if (placed.length >= MOST_NAMES) {
      break
    }
    const { layer } = one
    const size = placeNameSize(layer, view.zoom)
    const spacing = (layer.letterSpacing ?? 0) * size
    const words = layer.uppercase ? one.words.toLocaleUpperCase(language) : one.words
    const widthOf = (line: string) =>
      placeNameWidth(line, size, layer.weight, spacing, layer.uppercase)
    const lines = wrapped(words, (line) => widthOf(line) <= MOST_EMS * size)
    const width = Math.max(...lines.map(widthOf))
    const height = lines.length * size * LINE
    const [x, y] = one.at
    const box: Box = [
      x - width / 2 - PADDING,
      y - height / 2 - PADDING,
      x + width / 2 + PADDING,
      y + height / 2 + PADDING,
    ]
    const outside = box[0] < 0 || box[1] < 0 || box[2] > view.width || box[3] > view.height
    if (
      outside ||
      taken.some((other) => overlaps(other, box)) ||
      placed.some((other) => overlaps(other.box, box))
    ) {
      continue
    }
    placed.push({
      box,
      name: {
        amount: layer.amount,
        id: layer.id,
        letterSpacing: spacing,
        lines,
        size,
        weight: layer.weight,
        x,
        y,
      },
    })
  }
  return placed.map(({ name }) => name)
}
