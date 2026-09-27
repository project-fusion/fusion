import { describe, expect, test } from 'bun:test'
import { validateStyleMin } from '@maplibre/maplibre-gl-style-spec'
import { mapLibreStyle } from './map-style.js'
import { contrast, parseColor } from './oklab.js'

const LIGHT = {
  foreground: '#111111',
  info: '#1d6fd8',
  primary: '#7c3aed',
  success: '#2f8a3b',
  surface: '#f7f7f7',
}
const DARK = {
  foreground: '#f2f2f2',
  info: '#5aa0f2',
  primary: '#a78bfa',
  success: '#5fbf6c',
  surface: '#161616',
}

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

  test('asked for a globe, it draws one, and the style is one MapLibre accepts', () => {
    const style = mapLibreStyle(LIGHT, { globe: true })
    expect(style.projection).toEqual({ type: 'globe' })
    expect(style.sky?.['atmosphere-blend']).toBeDefined()
    expect(validateStyleMin(style as never)).toEqual([])
    expect(mapLibreStyle(LIGHT).projection).toBeUndefined()
    expect(mapLibreStyle(LIGHT).sky).toBeUndefined()
  })

  test('given a typeface, labels are drawn from it in the page, with no glyphs to fetch', () => {
    const style = mapLibreStyle(LIGHT, { font: 'Geist' })
    expect(style.glyphs).toBeUndefined()
    const fonts = style.layers
      .map((layer) => (layer.layout as Record<string, unknown> | undefined)?.['text-font'])
      .filter(Boolean)
    expect(fonts).toContainEqual(['Geist'])
    expect(fonts).toContainEqual(['Geist Bold', 'Geist'])
    expect(fonts).toContainEqual(['Geist Italic', 'Geist'])
    expect(validateStyleMin(style as never)).toEqual([])
    expect(mapLibreStyle(LIGHT).glyphs).toContain('openfreemap')
  })

  test('landmarks and highway signs name images the style describes, and neighborhoods are in capitals', () => {
    const style = mapLibreStyle(LIGHT)
    const images = style.metadata['helix:images']
    const layoutOf = (id: string): Record<string, unknown> =>
      (style.layers.find((layer) => layer.id === id)?.layout ?? {}) as Record<string, unknown>
    const named = JSON.stringify(layoutOf('label-landmark')['icon-image'])
    const ids = Object.keys(images).filter((id) => id.startsWith('helix-landmark-'))
    expect(ids.length).toBeGreaterThan(5)
    for (const id of ids) {
      expect(named).toContain(id)
      expect(images[id]).toMatchObject({ kind: 'landmark' })
    }
    expect(images['helix-sign-interstate-2']).toMatchObject({
      design: 'interstate',
      kind: 'sign',
      length: 2,
    })
    expect(layoutOf('label-neighbourhood')['text-transform']).toBe('uppercase')
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

  test('a light theme draws darker roads, and a dark one lighter, from the same roles', () => {
    const light = mapLibreStyle(LIGHT)
    const dark = mapLibreStyle(DARK)
    const road = (style: typeof light) => lightness(paint(style, 'road-minor', 'line-color'))
    const land = (style: typeof light) => lightness(paint(style, 'land', 'background-color'))
    expect(road(light)).toBeLessThan(land(light))
    expect(road(dark)).toBeGreaterThan(land(dark))
  })

  test('the more a thing has to be seen, the further it is toward the ink', () => {
    const style = mapLibreStyle(LIGHT)
    const land = lightness(paint(style, 'land', 'background-color'))
    const key = (id: string): string =>
      id === 'building' ? 'fill-color' : id.startsWith('label') ? 'text-color' : 'line-color'
    const order = ['building', 'road-minor', 'label-village', 'label-city'].map(
      (id) => land - lightness(paint(style, id, key(id))),
    )
    expect([...order].sort((a, b) => a - b)).toEqual(order)
  })

  test('every label clears the contrast target against the land it is haloed in', () => {
    /* A theme whose ink is already gray, where the designed steps toward it
       fell short: a mid gray on near-black. */
    const GRAY = { ...DARK, foreground: '#8c8c8c' }
    for (const colors of [LIGHT, DARK, GRAY]) {
      for (const target of [4.5, 7]) {
        const style = mapLibreStyle(colors, { contrast: target })
        const land = parseColor(String(paint(style, 'land', 'background-color')))
        /* Not a sign's number, which is read against the sign. */
        const labels = style.layers.filter(
          (layer) => String(layer.id).startsWith('label') && layer.id !== 'label-shield',
        )
        expect(labels.length).toBeGreaterThan(5)
        for (const label of labels) {
          /* Every color a label can be, a landmark's being one per kind. */
          const given = paint(style, String(label.id), 'text-color')
          const inks = (Array.isArray(given) ? given.flat(2) : [given])
            .map((one) => parseColor(String(one)))
            .filter((one): one is NonNullable<typeof one> => one !== null && one !== undefined)
          expect(inks.length).toBeGreaterThan(0)
          for (const ink of inks) {
            const ratio = land ? contrast(ink, land) : 0
            const inkRatio = contrast(parseColor(colors.foreground) as never, land as never)
            // Clears it, or is the ink itself where not even the ink can.
            expect(ratio).toBeGreaterThanOrEqual(Math.min(target, inkRatio) - 0.01)
          }
        }
      }
    }
  })

  test('a label that clears the target already keeps its place in the order', () => {
    const relaxed = mapLibreStyle(LIGHT, { contrast: 1 })
    const strict = mapLibreStyle(LIGHT, { contrast: 7 })
    const village = (style: typeof relaxed) =>
      lightness(paint(style, 'label-village', 'text-color'))
    // Designed as it is where nothing is asked of it, and darker where 7:1 is.
    expect(village(strict)).toBeLessThan(village(relaxed))
    // The city was always the darkest, and still is.
    expect(lightness(paint(strict, 'label-city', 'text-color'))).toBeLessThanOrEqual(
      village(strict),
    )
  })

  test('the roads a reader navigates by are drawn in the brand, and the rest are not', () => {
    // How much blue is in a paint beyond its green, which violet has and gray has not.
    const violet = (value: unknown): number => {
      const rgb = parseColor(String(value))
      if (!rgb) {
        throw new Error(`not a color: ${String(value)}`)
      }
      return rgb.blue - rgb.green
    }
    const style = mapLibreStyle(LIGHT)
    expect(violet(paint(style, 'road-motorway', 'line-color'))).toBeGreaterThan(0.1)
    expect(violet(paint(style, 'road-major', 'line-color'))).toBeGreaterThan(0.05)
    expect(Math.abs(violet(paint(style, 'road-secondary', 'line-color')))).toBeLessThan(0.02)
    expect(Math.abs(violet(paint(style, 'road-minor', 'line-color')))).toBeLessThan(0.02)
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
