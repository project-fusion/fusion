import type { MapLayerSpec } from './driver.js'
import {
  buildingsExtrusion,
  COVERS,
  captionLayer,
  geoJson,
  LAYERS,
  landcoverLayer,
  pointsJson,
  pointsLayers,
  pointsSource,
  rasterFrame,
  SOURCE,
  terrainLayer,
  terrainSource,
} from './layers.js'
import { cssColor, mix, parseColor } from './oklab.js'
import type { MapLibreStyle } from './style.js'

type StyleLayer = Record<string, unknown>

/** The face a style draws its names in, a heavier one where it has one, as the web's driver picks it. */
export const faceIn = (style: MapLibreStyle): string[] => {
  const faces = style.layers
    .filter((layer) => layer.type === 'symbol')
    .map((layer) => (layer.layout as Record<string, unknown> | undefined)?.['text-font'])
    .filter(
      (face): face is string[] =>
        Array.isArray(face) &&
        face.every((one) => typeof one === 'string') &&
        !face.some((one) => /italic/i.test(one)),
    )
  return (
    faces.find((face) => face.some((one) => /medium|semibold|bold/i.test(one))) ??
    faces[0] ?? ['Noto Sans Regular']
  )
}

/** Where the first layer drawing `sourceLayer` stands, or where the labels start where none does. */
const firstOf = (layers: readonly StyleLayer[], test: (layer: StyleLayer) => boolean): number => {
  const at = layers.findIndex(test)
  return at < 0 ? layers.length : at
}

/** The layers and sources one spec adds, and where they go: under the roads, under the labels, or on top. */
interface Added {
  readonly layers: readonly StyleLayer[]
  readonly sources: Readonly<Record<string, Record<string, unknown>>>
  readonly where: 'ground' | 'labels' | 'top' | 'water'
}

const rasterAdded = (spec: MapLayerSpec): Added => {
  const tiles = spec.frames?.[spec.frame ?? 0]
  if (!tiles) {
    return { layers: [], sources: {}, where: 'labels' }
  }
  const id = rasterFrame(spec.id, spec.frame ?? 0)
  return {
    layers: [
      {
        id,
        paint: { 'raster-opacity': spec.ground ? 1 : (spec.opacity ?? 0.7) },
        source: id,
        type: 'raster',
      },
    ],
    sources: {
      [id]: {
        ...(spec.attribution ? { attribution: spec.attribution } : {}),
        ...(spec.maxZoom === undefined ? {} : { maxzoom: spec.maxZoom }),
        tileSize: 256,
        tiles: [tiles],
        type: 'raster',
      },
    },
    where: spec.ground ? 'ground' : 'labels',
  }
}

const terrainAdded = (spec: MapLayerSpec): Added => {
  if (!spec.src) {
    return { layers: [], sources: {}, where: 'ground' }
  }
  const source = terrainSource(spec.id, 'shade')
  return {
    layers: [
      {
        id: terrainLayer(spec.id),
        paint: {
          'hillshade-accent-color': spec.color,
          'hillshade-highlight-color': spec.highlight ?? spec.color,
          'hillshade-shadow-color': spec.color,
        },
        source,
        type: 'hillshade',
      },
    ],
    sources: {
      [source]: {
        encoding: spec.encoding ?? 'terrarium',
        ...(spec.maxZoom === undefined ? {} : { maxzoom: spec.maxZoom }),
        tileSize: 256,
        tiles: [spec.src],
        type: 'raster-dem',
      },
    },
    where: 'ground',
  }
}

const landcoverAdded = (spec: MapLayerSpec, source: string | undefined): Added => {
  const land = parseColor(spec.color)
  if (!source || !land) {
    return { layers: [], sources: {}, where: 'water' }
  }
  const fill: unknown[] = ['match', ['get', 'class']]
  for (const [cover, color, amount] of COVERS) {
    fill.push(cover, cssColor(mix(land, color, amount)))
  }
  fill.push('rgba(0, 0, 0, 0)')
  return {
    layers: [
      {
        filter: ['match', ['get', 'class'], COVERS.map(([cover]) => cover), true, false],
        id: landcoverLayer(spec.id),
        paint: { 'fill-color': fill },
        source,
        'source-layer': 'landcover',
        type: 'fill',
      },
    ],
    sources: {},
    where: 'water',
  }
}

const pointsAdded = (spec: MapLayerSpec, face: string[]): Added => {
  const source = pointsSource(spec.id)
  return {
    layers: pointsLayers(spec.id, spec, face) as unknown as StyleLayer[],
    sources: {
      [source]: {
        cluster: spec.cluster === true,
        clusterRadius: 50,
        data: pointsJson(spec.points),
        type: 'geojson',
      },
    },
    where: 'top',
  }
}

/** What one spec adds to the style, or nothing where a renderer draws it apart, as the routes and areas are. */
const addedOf = (spec: MapLayerSpec, style: MapLibreStyle, face: string[]): Added => {
  const sourceOf = (sourceLayer: string): string | undefined =>
    style.layers.find((layer) => layer['source-layer'] === sourceLayer)?.source as
      | string
      | undefined
  switch (spec.kind) {
    case 'raster':
      return rasterAdded(spec)
    case 'terrain':
      return terrainAdded(spec)
    case 'landcover':
      return landcoverAdded(spec, sourceOf('landcover'))
    case 'buildings': {
      const source = sourceOf('building')
      return source
        ? { layers: [buildingsExtrusion(spec, source)], sources: {}, where: 'labels' }
        : { layers: [], sources: {}, where: 'labels' }
    }
    case 'points':
      return pointsAdded(spec, face)
    default:
      return { layers: [], sources: {}, where: 'labels' }
  }
}

/**
 * **A themed style with the frame's layers in it**, as one style a renderer
 * that takes a whole style draws, as MapLibre Native does on a phone: the
 * routes and areas from one GeoJSON source under the place names, their
 * captions over them; imagery, shading and land cover under the roads; the
 * raised buildings and tile overlays under the names; and each points layer
 * on top, gathered into counts where it asks. The same sources, filters and
 * paints the web's driver adds to a style one by one.
 */
export const composedStyle = (
  style: MapLibreStyle,
  specs: readonly MapLayerSpec[],
): MapLibreStyle => {
  const face = faceIn(style)
  const sources = { ...style.sources }
  const ground: StyleLayer[] = []
  const water: StyleLayer[] = []
  const labels: StyleLayer[] = []
  const top: StyleLayer[] = []
  const lists = { ground, labels, top, water }
  for (const spec of specs) {
    const added = addedOf(spec, style, face)
    Object.assign(sources, added.sources)
    lists[added.where].push(...added.layers)
  }
  const shapes = specs.filter((spec) => spec.kind === 'route' || spec.kind === 'area')
  if (shapes.length > 0) {
    sources[SOURCE] = { data: geoJson([...shapes]), type: 'geojson' }
    labels.push(...(LAYERS as unknown as StyleLayer[]))
    top.unshift(captionLayer(face))
  }
  const layers = [...style.layers]
  const insert = (at: number, added: readonly StyleLayer[]) => {
    layers.splice(at, 0, ...added)
  }
  insert(layers.length, top)
  insert(
    firstOf(layers, (layer) => layer.type === 'symbol'),
    labels,
  )
  insert(
    firstOf(layers, (layer) => layer['source-layer'] === 'transportation'),
    ground,
  )
  insert(
    firstOf(layers, (layer) => layer['source-layer'] === 'water'),
    water,
  )
  return { ...style, layers, sources }
}
