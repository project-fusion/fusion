/*
 * The layers a frame's routes, areas, points, buildings and land cover are
 * drawn as in MapLibre, on the web through `@fusion.dev/helix-map` and on a
 * phone through MapLibre Native: the same sources, filters and paints.
 */

import type { MapLayerSpec } from './driver.js'
import { oklch, type Rgb } from './oklab.js'

/** The frame's routes and areas, as MapLibre draws GeoJSON. */
export interface GeoJson {
  features: (
    | {
        geometry: { coordinates: unknown; type: 'LineString' | 'Polygon' }
        properties: {
          casing?: string
          color: string
          faded?: boolean
          kind: 'area' | 'route'
          label: string
          pattern?: 'dotted'
        }
        type: 'Feature'
      }
    | {
        geometry: { coordinates: [number, number]; type: 'Point' }
        properties: {
          anchor: 'bottom' | 'center'
          halo: string
          ink: string
          kind: 'caption'
          text: string
        }
        type: 'Feature'
      }
  )[]
  type: 'FeatureCollection'
}

/**
 * A style layer as far as the driver writes one: a fill or a line, which
 * MapLibre types apart and so must this.
 */
export type MapLibreLayer =
  | { filter: unknown[]; id: string; paint: Record<string, unknown>; source: string; type: 'fill' }
  | {
      filter: unknown[]
      id: string
      layout: Record<string, unknown>
      paint: Record<string, unknown>
      source: string
      type: 'line'
    }

/** Where the frame's routes and areas are drawn from, one source for all of them. */
export const SOURCE = 'helix-layers'

/** Their layers, from the bottom up: areas under their own edges, routes over both. */
export const LAYERS: MapLibreLayer[] = [
  {
    filter: ['==', ['get', 'kind'], 'area'],
    id: 'helix-areas',
    paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.16 },
    source: SOURCE,
    type: 'fill',
  },
  {
    filter: ['==', ['get', 'kind'], 'area'],
    id: 'helix-area-edges',
    layout: { 'line-join': 'round' },
    paint: { 'line-color': ['get', 'color'], 'line-width': 1.5 },
    source: SOURCE,
    type: 'line',
  },
  /* **A casing under each route that has one**, wider by an edge's width
     either side, so a route in the brand is not one more brand road. */
  {
    filter: ['all', ['==', ['get', 'kind'], 'route'], ['has', 'casing']],
    id: 'helix-route-casings',
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: {
      'line-color': ['get', 'casing'],
      'line-opacity': ['case', ['boolean', ['get', 'faded'], false], 0.4, 1],
      'line-width': ['interpolate', ['linear'], ['zoom'], 4, 5.5, 14, 9],
    },
    source: SOURCE,
    type: 'line',
  },
  /* **A dotted leg in a layer of its own**: MapLibre takes a dash pattern
     per layer and not per line, so the dotted legs cannot share the solid
     routes' layer. Dashes of no length with round caps are dots. */
  {
    filter: ['all', ['==', ['get', 'kind'], 'route'], ['==', ['get', 'pattern'], 'dotted']],
    id: 'helix-route-dots',
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: {
      'line-color': ['get', 'color'],
      'line-dasharray': [0, 2],
      'line-opacity': ['case', ['boolean', ['get', 'faded'], false], 0.4, 1],
      'line-width': ['interpolate', ['linear'], ['zoom'], 4, 2.5, 14, 5],
    },
    source: SOURCE,
    type: 'line',
  },
  {
    filter: ['all', ['==', ['get', 'kind'], 'route'], ['!=', ['get', 'pattern'], 'dotted']],
    id: 'helix-routes',
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    /* The part of a route already traveled, quieter than the part ahead. */
    paint: {
      'line-color': ['get', 'color'],
      'line-opacity': ['case', ['boolean', ['get', 'faded'], false], 0.4, 1],
      'line-width': ['interpolate', ['linear'], ['zoom'], 4, 2.5, 14, 5],
    },
    source: SOURCE,
    type: 'line',
  },
]

/**
 * The areas' captions, a layer of their own over the place names, so a
 * caption is placed before a street's name that would meet it, and never
 * hidden for one: a sector's letter is what the reader is looking for.
 */
export const CAPTIONS = 'helix-area-captions'

/** The caption layer, in the face the style draws its names in. */
export const captionLayer = (font: readonly string[]): Record<string, unknown> => ({
  filter: ['==', ['get', 'kind'], 'caption'],
  id: CAPTIONS,
  layout: {
    'text-allow-overlap': true,
    'text-anchor': ['get', 'anchor'],
    'text-field': ['get', 'text'],
    'text-font': font,
    /* Words above a place stand a little clear of it. */
    'text-offset': [
      'case',
      ['==', ['get', 'anchor'], 'bottom'],
      ['literal', [0, -0.3]],
      ['literal', [0, 0]],
    ],
    'text-size': 14,
  },
  paint: { 'text-color': ['get', 'ink'], 'text-halo-color': ['get', 'halo'], 'text-halo-width': 2 },
  source: SOURCE,
  type: 'symbol',
})

/** The routes and areas as GeoJSON, longitude first, an area's ring closed as GeoJSON requires. */
export const geoJson = (layers: MapLayerSpec[]): GeoJson => ({
  features: layers.flatMap((layer): GeoJson['features'] => {
    if (layer.kind !== 'area' && layer.kind !== 'route') {
      return []
    }
    const coordinates = layer.points.map(({ lat, lng }) => [lng, lat])
    const caption = layer.caption
      ? [
          {
            geometry: {
              coordinates: [layer.caption.at.lng, layer.caption.at.lat] as [number, number],
              type: 'Point' as const,
            },
            properties: {
              anchor: layer.caption.anchor,
              halo: layer.caption.halo,
              ink: layer.caption.ink,
              kind: 'caption' as const,
              text: layer.caption.text,
            },
            type: 'Feature' as const,
          },
        ]
      : []
    const shape = {
      geometry:
        layer.kind === 'route'
          ? { coordinates, type: 'LineString' as const }
          : { coordinates: [[...coordinates, coordinates[0]]], type: 'Polygon' as const },
      properties: {
        ...(layer.casing ? { casing: layer.casing } : {}),
        color: layer.color,
        ...(layer.faded ? { faded: true } : {}),
        ...(layer.pattern ? { pattern: layer.pattern } : {}),
        kind: layer.kind,
        label: layer.label,
      },
      type: 'Feature' as const,
    }
    return [shape, ...caption]
  }),
  type: 'FeatureCollection',
})

/** A buildings layer's style layer, one per element. */
export const buildingsLayer = (id: string): string => `helix-buildings-${id}`

/** The kinds of layer drawn apart from the routes, areas, and points. */
export const EXTRAS = new Set<MapLayerSpec['kind']>([
  'buildings',
  'contours',
  'landcover',
  'raster',
  'terrain',
])

/** A contours layer's lines and their labels, one GeoJSON source for both. */
export const contoursSource = (id: string): string => `helix-contours-${id}`

/** A land cover layer's fill. */
export const landcoverLayer = (id: string): string => `helix-landcover-${id}`

/**
 * The covers the schema names, each a color mixed into the land by how much
 * it covers the ground, at a lightness between a light and a dark land:
 * forest greener than grass, farmland wheat, sand tan, rock gray, ice pale.
 */
export const COVERS: readonly [string, Rgb, number][] = [
  ['wood', oklch(0.55, 0.11, 145), 0.42],
  ['grass', oklch(0.68, 0.1, 130), 0.3],
  ['farmland', oklch(0.75, 0.08, 90), 0.32],
  ['wetland', oklch(0.62, 0.07, 185), 0.35],
  ['sand', oklch(0.8, 0.06, 80), 0.4],
  ['rock', oklch(0.62, 0.015, 60), 0.35],
  ['ice', oklch(0.93, 0.03, 230), 0.55],
]

/** No lines, for a contours layer while the map is too far out to draw any. */
export const NO_LINES = { features: [], type: 'FeatureCollection' }

/** A terrain layer's hill shading, one style layer. */
export const terrainLayer = (id: string): string => `helix-terrain-${id}`

/**
 * A terrain layer's sources: one for the shading and one for the raised
 * ground, since MapLibre draws both better from sources of their own.
 */
export const terrainSource = (id: string, use: 'dem' | 'shade'): string =>
  `helix-terrain-${id}-${use}`

/** A raster layer's frame, one source and one style layer each, so every frame's tiles stay loaded. */
export const rasterFrame = (id: string, at: number): string => `helix-raster-${id}-${at}`

/**
 * The buildings raised to the heights the tiles record, where the tiles mark a
 * building as one to raise.
 */
export const buildingsExtrusion = (spec: MapLayerSpec, source: string) => ({
  filter: ['!=', ['get', 'hide_3d'], true],
  id: buildingsLayer(spec.id),
  minzoom: 13,
  paint: {
    'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
    'fill-extrusion-color': spec.color,
    'fill-extrusion-height': ['coalesce', ['get', 'render_height'], 0],
    'fill-extrusion-opacity': 0.9,
  },
  source,
  'source-layer': 'building',
  type: 'fill-extrusion' as const,
})

/** A points layer's source, one each, since MapLibre clusters by source. */
export const pointsSource = (id: string): string => `helix-points-${id}`

/**
 * A points layer's points as GeoJSON, each carrying where it is in the list,
 * which is how a press finds it again.
 */
export const pointsJson = (points: MapLayerSpec['points']) => ({
  features: points.map(({ lat, lng }, at) => ({
    geometry: { coordinates: [lng, lat], type: 'Point' as const },
    properties: { at },
    type: 'Feature' as const,
  })),
  type: 'FeatureCollection' as const,
})

/**
 * A points layer's style layers, bottom up: a halo round each count, the
 * count's circle, the count, and the points on their own. **A count grows by
 * the step**, so a hundred reads larger than ten at a glance rather than by
 * its figures alone; **its figures take the style's own face**, the one its
 * place names are set in, since a style carries only the faces it names.
 */
export const pointsLayers = (
  id: string,
  spec: MapLayerSpec,
  font: unknown,
): {
  id: string
  layout?: Record<string, unknown>
  paint: Record<string, unknown>
  type: string
}[] => {
  const source = pointsSource(id)
  const clustered = ['has', 'point_count']
  const size = ['step', ['get', 'point_count'], 14, 25, 17, 100, 21, 1000, 26]
  return [
    {
      id: `${source}-halo`,
      paint: {
        'circle-color': spec.color,
        'circle-opacity': 0.22,
        'circle-radius': ['+', size, 6],
      },
      type: 'circle',
    },
    {
      id: `${source}-clusters`,
      paint: {
        'circle-color': spec.color,
        'circle-radius': size,
        'circle-stroke-color': spec.casing ?? spec.color,
        'circle-stroke-width': 2,
      },
      type: 'circle',
    },
    {
      id: `${source}-count`,
      layout: {
        'text-allow-overlap': true,
        'text-field': ['get', 'point_count_abbreviated'],
        'text-font': font,
        'text-size': 12,
      },
      paint: { 'text-color': spec.ink ?? '#ffffff' },
      type: 'symbol',
    },
    {
      id: `${source}-points`,
      paint: {
        'circle-color': spec.color,
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 3, 15, 6],
        'circle-stroke-color': spec.casing ?? spec.color,
        'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 8, 1, 15, 1.5],
      },
      type: 'circle',
    },
  ].map((layer, at) => ({
    ...layer,
    filter: at === 3 ? ['!', clustered] : clustered,
    source,
  })) as never
}
