import { describe, expect, test } from 'bun:test'
import type { MapView } from './camera.js'
import { PLACE_NAME_LAYERS, placeNameSize, placeNames, placeNameWidth } from './names.js'
import { legible, parseColor, type Rgb } from './oklab.js'
import { snapshotTiles } from './snapshot.js'
import { mapLibreStyle } from './style.js'
import type { TileFeature, TileLayer } from './tile.js'

const COLORS = {
  foreground: '#1a1a1a',
  info: '#2563eb',
  primary: '#7c3aed',
  success: '#16a34a',
  surface: '#ffffff',
}

/** The middle of tile 2048, 2048 at zoom 12, back from Web Mercator. */
const MIDDLE = 2048.5 / 4096

/** A view of that one tile at zoom 12, the tile filling a box 512 pixels a side. */
const VIEW: MapView = {
  center: {
    lat: (Math.atan(Math.sinh(Math.PI * (1 - 2 * MIDDLE))) * 180) / Math.PI,
    lng: MIDDLE * 360 - 180,
  },
  height: 512,
  width: 512,
  zoom: 12,
}

/** A place point in tile units, 4096 a side. */
const place = (
  name: string,
  kind: string,
  x: number,
  y: number,
  more: Record<string, number | string> = {},
): TileFeature => ({
  lines: [[{ x, y }]],
  properties: { class: kind, name, ...more },
  type: 1,
})

/** The tile the view shows, its top left at the box's top left. */
const tileOf = (features: TileFeature[]): [readonly [number, number], TileLayer] => [
  [2048, 2048],
  { extent: 4096, features },
]

describe('PLACE_NAME_LAYERS', () => {
  test("hold each place name to the style's layer of the same id", () => {
    const style = mapLibreStyle(COLORS)
    const land = parseColor(COLORS.surface) as Rgb
    const ink = parseColor(COLORS.foreground) as Rgb
    for (const layer of PLACE_NAME_LAYERS) {
      const styled = style.layers.find((one) => one.id === layer.id) as
        | {
            filter: unknown[]
            layout: Record<string, unknown>
            minzoom: number
            paint: Record<string, unknown>
          }
        | undefined
      expect(styled).toBeDefined()
      expect(styled?.minzoom).toBe(layer.minzoom)
      expect(styled?.layout['text-size']).toEqual([
        'interpolate',
        ['linear'],
        ['zoom'],
        ...layer.size.flat(),
      ])
      expect(JSON.stringify(styled?.filter)).toContain(JSON.stringify(layer.classes[0]))
      for (const kind of layer.classes) {
        expect(JSON.stringify(styled?.filter)).toContain(`"${kind}"`)
      }
      expect(styled?.paint['text-color']).toBe(legible(land, ink, land, 4.5, layer.amount))
      expect(styled?.layout['text-transform'] === 'uppercase').toBe(layer.uppercase === true)
      expect(styled?.layout['text-letter-spacing'] ?? 0).toBe(layer.letterSpacing ?? 0)
    }
  })

  test('size each name linearly between its two zooms, held at either end', () => {
    const city = PLACE_NAME_LAYERS[0]
    if (city === undefined) {
      throw new Error('no city layer')
    }
    expect(placeNameSize(city, 2)).toBe(11)
    expect(placeNameSize(city, 9)).toBeCloseTo(15.5)
    expect(placeNameSize(city, 18)).toBe(20)
  })
})

describe('placeNames', () => {
  test('draws a city, a town, a village and a neighborhood, and no other place', () => {
    const names = placeNames(snapshotTiles(VIEW, 14, 4), VIEW, [
      tileOf([
        place('Austin', 'city', 2048, 1000),
        place('Pflugerville', 'town', 2048, 2048),
        place('Manchaca', 'village', 1000, 3000),
        place('Hyde Park', 'suburb', 3000, 3000),
        place('Texas', 'state', 2048, 3600),
        place('Barton Springs', 'locality', 600, 600),
      ]),
    ])
    expect(names.map((one) => one.lines.join(' '))).toEqual([
      'Austin',
      'Pflugerville',
      'HYDE PARK',
      'Manchaca',
    ])
    expect(names[0]?.weight).toBe('bold')
    expect(names[0]?.size).toBeGreaterThan(names[1]?.size ?? 99)
  })

  test("names a place in the frame's language, or its first part, where the tile has it", () => {
    const names = placeNames(
      snapshotTiles(VIEW, 14, 4),
      VIEW,
      [tileOf([place('München', 'city', 2048, 2048, { 'name:en': 'Munich' })])],
      'en-US',
    )
    expect(names[0]?.lines).toEqual(['Munich'])
  })

  test('leaves out a name that would overlap one placed before it, the city winning', () => {
    const names = placeNames(snapshotTiles(VIEW, 14, 4), VIEW, [
      tileOf([
        place('Round Rock', 'town', 2048, 2060),
        place('Austin', 'city', 2048, 2048),
        place('Far Away', 'town', 2048, 600),
      ]),
    ])
    expect(names.map((one) => one.lines.join(' '))).toEqual(['Austin', 'Far Away'])
  })

  test('leaves out a name that would overlap a box already taken, such as a count', () => {
    const names = placeNames(
      snapshotTiles(VIEW, 14, 4),
      VIEW,
      [tileOf([place('Austin', 'city', 2048, 2048), place('Far Away', 'town', 2048, 600)])],
      'en',
      [[236, 236, 276, 276]],
    )
    expect(names.map((one) => one.lines[0])).toEqual(['Far Away'])
  })

  test('places the lower rank first within a layer', () => {
    const names = placeNames(snapshotTiles(VIEW, 14, 4), VIEW, [
      tileOf([
        place('Lesser', 'town', 2048, 2060, { rank: 12 }),
        place('Greater', 'town', 2048, 2048, { rank: 3 }),
      ]),
    ])
    expect(names.map((one) => one.lines[0])).toEqual(['Greater'])
  })

  test("leaves out a name that runs past the view's edge", () => {
    const names = placeNames(snapshotTiles(VIEW, 14, 4), VIEW, [
      tileOf([place('Edgewood', 'town', 0, 2048), place('Middleton', 'town', 2048, 2048)]),
    ])
    expect(names.map((one) => one.lines[0])).toEqual(['Middleton'])
  })

  test('leaves out a name its layer does not show at the zoom yet', () => {
    /* At zoom 10.5 the tiles are asked at 10, where the view's middle is a
       quarter of the way into tile 512, 512. */
    const view = { ...VIEW, zoom: 10.5 }
    const names = placeNames(snapshotTiles(view, 14, 4), view, [
      [
        [512, 512],
        {
          extent: 4096,
          features: [place('Smallville', 'village', 512, 512), place('Bigton', 'town', 512, 700)],
        },
      ],
    ])
    expect(names.map((one) => one.lines[0])).toEqual(['Bigton'])
  })

  test('wraps a long name at eight ems, each line no wider than that', () => {
    const names = placeNames(snapshotTiles(VIEW, 14, 4), VIEW, [
      tileOf([place('Saint Edwards University Heights', 'town', 2048, 2048)]),
    ])
    const [name] = names
    expect(name?.lines.length).toBeGreaterThan(1)
    for (const line of name?.lines ?? []) {
      expect(placeNameWidth(line, name?.size ?? 0, 'regular', 0)).toBeLessThanOrEqual(
        8 * (name?.size ?? 0),
      )
    }
  })
})
