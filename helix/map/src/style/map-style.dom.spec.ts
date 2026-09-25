import { describe, expect, test } from 'bun:test'
import { validateStyleMin } from '@maplibre/maplibre-gl-style-spec'
import { mapLibreStyle } from './map-style.js'
import { parseColor } from './oklab.js'

const LIGHT = { foreground: '#111111', info: '#1d6fd8', success: '#2f8a3b', surface: '#f7f7f7' }
const DARK = { foreground: '#f2f2f2', info: '#5aa0f2', success: '#5fbf6c', surface: '#161616' }

/** How light a paint is, which is all the direction of a mix needs. */
const lightness = (value: unknown): number => {
  const rgb = parseColor(String(value))
  if (!rgb) {
    throw new Error(`not a color: ${String(value)}`)
  }
  return 0.2126 * rgb.red + 0.7152 * rgb.green + 0.0722 * rgb.blue
}

const paint = (style: ReturnType<typeof mapLibreStyle>, id: string, key: string): unknown =>
  (style.layers.find((layer) => layer.id === id)?.paint as Record<string, unknown> | undefined)?.[
    key
  ]

describe('mapLibreStyle', () => {
  test('writes a style MapLibre accepts, in either theme', () => {
    for (const colors of [LIGHT, DARK]) {
      expect(validateStyleMin(mapLibreStyle(colors) as never)).toEqual([])
    }
  })

  test('draws on the land and reads its tiles and type from OpenFreeMap', () => {
    const style = mapLibreStyle(LIGHT)
    expect(style.layers[0]).toMatchObject({ id: 'land', type: 'background' })
    expect(paint(style, 'land', 'background-color')).toBe('rgb(247, 247, 247)')
    expect(style.sources.openmaptiles).toEqual({
      type: 'vector',
      url: 'https://tiles.openfreemap.org/planet',
    })
    expect(style.glyphs).toContain('tiles.openfreemap.org/fonts/{fontstack}/{range}')
  })

  test('a light theme draws darker roads, and a dark one lighter, from the same four roles', () => {
    const light = mapLibreStyle(LIGHT)
    const dark = mapLibreStyle(DARK)
    const road = (style: typeof light) => lightness(paint(style, 'road-major', 'line-color'))
    const land = (style: typeof light) => lightness(paint(style, 'land', 'background-color'))
    expect(road(light)).toBeLessThan(land(light))
    expect(road(dark)).toBeGreaterThan(land(dark))
  })

  test('the more a thing has to be seen, the further it is toward the ink', () => {
    const style = mapLibreStyle(LIGHT)
    const land = lightness(paint(style, 'land', 'background-color'))
    const order = ['building', 'road-minor', 'road-major', 'road-motorway'].map(
      (id) => land - lightness(paint(style, id, id === 'building' ? 'fill-color' : 'line-color')),
    )
    expect([...order].sort((a, b) => a - b)).toEqual(order)
    const city = lightness(paint(style, 'label-city', 'text-color'))
    expect(land - city).toBeGreaterThan(order.at(-1) ?? 0)
  })

  test('a heritage district is not drawn as a park', () => {
    const park = mapLibreStyle(LIGHT).layers.find((layer) => layer.id === 'park')
    expect(JSON.stringify(park?.filter)).toContain('["!=",["get","class"],"historic"]')
  })

  test('labels are written in the language asked for, then the Latin name, then the local one', () => {
    const style = mapLibreStyle(LIGHT, { language: 'fr' })
    const layout = style.layers.find((layer) => layer.id === 'label-city')?.layout as Record<
      string,
      unknown
    >
    expect(layout['text-field']).toEqual([
      'coalesce',
      ['get', 'name:fr'],
      ['get', 'name:latin'],
      ['get', 'name'],
    ])
  })

  test('its own tiles and type, where a page serves them', () => {
    const style = mapLibreStyle(LIGHT, {
      glyphs: 'https://example.com/fonts/{fontstack}/{range}.pbf',
      tiles: 'https://example.com/tiles.json',
    })
    expect(style.sources.openmaptiles?.url).toBe('https://example.com/tiles.json')
    expect(style.glyphs).toBe('https://example.com/fonts/{fontstack}/{range}.pbf')
  })

  test('a color a map style cannot parse is refused by name, not drawn black', () => {
    expect(() => mapLibreStyle({ ...LIGHT, surface: 'oklch(98% 0 0)' })).toThrow(/`surface`/)
  })
})
