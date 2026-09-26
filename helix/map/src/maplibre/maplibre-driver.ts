import type { MapDriver, MapLayerSpec, MapPadding } from '../connect-map/connect-map.js'
import type { MapMotion } from '../motion/motion.js'

/** The frame's routes and areas, as MapLibre draws GeoJSON. */
interface GeoJson {
  features: {
    geometry: { coordinates: unknown; type: 'LineString' | 'Polygon' }
    properties: {
      casing?: string
      color: string
      faded?: boolean
      kind: 'area' | 'route'
      label: string
    }
    type: 'Feature'
  }[]
  type: 'FeatureCollection'
}

/**
 * A style layer as far as the driver writes one: a fill or a line, which
 * MapLibre types apart and so must this.
 */
type MapLibreLayer =
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
const SOURCE = 'helix-layers'

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
  {
    filter: ['==', ['get', 'kind'], 'route'],
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

/** The specs as GeoJSON, longitude first, an area's ring closed as GeoJSON requires. */
export const geoJson = (layers: MapLayerSpec[]): GeoJson => ({
  features: layers.map((layer) => {
    const coordinates = layer.points.map(({ lat, lng }) => [lng, lat])
    return {
      geometry:
        layer.kind === 'route'
          ? { coordinates, type: 'LineString' as const }
          : { coordinates: [[...coordinates, coordinates[0]]], type: 'Polygon' as const },
      properties: {
        ...(layer.casing ? { casing: layer.casing } : {}),
        color: layer.color,
        ...(layer.faded ? { faded: true } : {}),
        kind: layer.kind,
        label: layer.label,
      },
      type: 'Feature' as const,
    }
  }),
  type: 'FeatureCollection',
})

/** How MapLibre is told to move: over a time and a curve, or at once. */
interface MapLibreAnimation {
  animate?: boolean
  duration?: number
  easing?: (t: number) => number
}

/**
 * The part of a MapLibre `Map` the driver uses, so this package imports no
 * renderer and a page brings whichever version it has.
 */
export interface MapLibreMap {
  /** The canvas, which MapLibre makes focusable. */
  getCanvas(): HTMLElement
  /** The element the map was made in, which holds its controls. */
  getContainer(): HTMLElement
  /**
   * Adds a style layer, under the one named where one is. **Typed `never`**
   * because MapLibre types a layer as its whole style specification, which
   * this package does not import; what the driver adds is held to MapLibre's
   * own validator by a spec instead, which is a stricter check than a type.
   */
  addLayer(layer: never, beforeId?: string): unknown
  /** Adds a source, which the frame's routes and areas are one of. `never` for `addLayer`'s reason. */
  addSource(id: string, source: never): unknown
  /** Frames a stretch of the world, west-south then east-north. */
  fitBounds(
    bounds: [[number, number], [number, number]],
    options?: MapLibreAnimation & { padding?: MapPadding },
  ): unknown
  /** A layer by its id, or nothing where there is none. */
  getLayer(id: string): unknown
  /** A source by its id: `attribution` is its credit, `setData` what redraws a GeoJSON one. */
  getSource(
    id: string,
  ): { attribution?: string | undefined; setData?(data: GeoJson): unknown } | undefined
  /** The style as it stands: its sources are the ones to credit, and its layers what to draw under. */
  getStyle():
    | {
        layers?: { id: string; type: string }[] | undefined
        sources?: Record<string, unknown> | undefined
      }
    | undefined
  /** Goes to a place, gliding. */
  easeTo(options: MapLibreAnimation & { center: [number, number]; zoom?: number }): unknown
  /** Goes to a place at once. */
  jumpTo(options: { center: [number, number]; zoom?: number }): unknown
  /** The arrow-key handler MapLibre adds unless told not to. */
  keyboard: { disable(): void; enable(): void; isEnabled(): boolean }
  off(type: 'load' | 'move' | 'resize' | 'sourcedata' | 'styledata', listener: () => void): unknown
  on(type: 'load' | 'move' | 'resize' | 'sourcedata' | 'styledata', listener: () => void): unknown
  removeLayer(id: string): unknown
  removeSource(id: string): unknown
  panBy(offset: [number, number], options?: MapLibreAnimation): unknown
  /** Where a place falls in the map's box, in pixels. */
  project(lngLat: [number, number]): { x: number; y: number }
  zoomIn(options?: MapLibreAnimation): unknown
  zoomOut(options?: MapLibreAnimation): unknown
}

/** The class MapLibre's own credit control draws, by its documented name. */
const CONTROL = '.maplibregl-ctrl-attrib'

/**
 * The page's motion as MapLibre takes it: its own duration and curve rather
 * than MapLibre's, so a map pans the way the page's panels slide.
 */
const animation = (motion: MapMotion | null): MapLibreAnimation =>
  motion ? { duration: motion.duration, easing: motion.easing } : { animate: false }

/**
 * Drives a MapLibre map from the Map frame.
 *
 * **The credit is every source's `attribution`**, read again whenever a style
 * or a source changes, since a vector source learns its credit from its
 * TileJSON after the style has loaded. **MapLibre's own credit control is
 * hidden while connected** rather than removed, because the map was made with
 * it and there is no public way to take it off: making the map with
 * `attributionControl: false` avoids it altogether, and is the better way.
 */
export const mapLibreDriver = (map: MapLibreMap): MapDriver => ({
  credits(changed) {
    const control = map.getContainer().querySelector<HTMLElement>(CONTROL)
    const display = control?.style.display ?? ''
    if (control) {
      control.style.display = 'none'
    }
    map.on('styledata', changed)
    map.on('sourcedata', changed)
    return {
      read: () =>
        Object.keys(map.getStyle()?.sources ?? {})
          .map((id) => map.getSource(id)?.attribution ?? '')
          .filter((one) => one !== ''),
      stop: () => {
        map.off('styledata', changed)
        map.off('sourcedata', changed)
        if (control) {
          control.style.display = display
        }
      },
    }
  },
  fit: ({ northEast, southWest }, padding, motion) => {
    map.fitBounds(
      [
        [southWest.lng, southWest.lat],
        [northEast.lng, northEast.lat],
      ],
      { ...animation(motion), padding },
    )
  },
  focusTarget: () => map.getCanvas(),
  /* **Under the place names**, which is the one thing a page drawing its own
     canvas over the map could not do: a route crossing a city is under the
     city's name, not through it. And **drawn again whenever the style is
     replaced**: a page re-theming its map with \`setStyle\` hands MapLibre a
     style without these, and the diff takes them away, so they come back on
     the next \`styledata\` with their colors read again, which is how a
     route follows the theme. */
  layers: (read) => {
    /* **Tried rather than asked about.** \`isStyleLoaded()\` waits for the
       tiles as well as the style, so on a fresh map it said no through every
       \`styledata\` and yes only after the last one, and no route was drawn
       until something restyled the map. A style that is not ready says so by
       refusing the source, and \`load\` comes after that. */
    const draw = (): void => {
      const data = geoJson(read())
      const source = map.getSource(SOURCE)
      if (source?.setData) {
        source.setData(data)
        return
      }
      /* **Simplified by zoom, not smoothed.** A route is the router's path
         along the streets, and a curve fitted through it would cut the
         corners it turns and leave the street it is on, which is why no map
         app smooths one. What they do is draw fewer points zoomed out, and
         MapLibre does that per tile by \`tolerance\`: at its default a walk
         kept every stair-step at a kink, at 2 it began cutting corners
         through blocks, and at 1 it is the streets without the jitter, with
         every turn back as the map zooms in. */
      try {
        map.addSource(SOURCE, { data, tolerance: 1, type: 'geojson' } as never)
      } catch {
        return
      }
      const labels = map.getStyle()?.layers?.find((layer) => layer.type === 'symbol')?.id
      for (const layer of LAYERS) {
        map.addLayer(layer as never, labels)
      }
    }
    const restore = (): void => {
      if (!map.getSource(SOURCE)) {
        draw()
      }
    }
    map.on('styledata', restore)
    map.on('load', restore)
    draw()
    return {
      stop: () => {
        map.off('styledata', restore)
        map.off('load', restore)
        for (const layer of [...LAYERS].reverse()) {
          if (map.getLayer(layer.id)) {
            map.removeLayer(layer.id)
          }
        }
        if (map.getSource(SOURCE)) {
          map.removeSource(SOURCE)
        }
      },
      update: draw,
    }
  },
  onView: (moved) => {
    map.on('move', moved)
    map.on('resize', moved)
    return () => {
      map.off('move', moved)
      map.off('resize', moved)
    }
  },
  panBy: (x, y, motion) => {
    map.panBy([x, y], animation(motion))
  },
  project: ({ lat, lng }) => {
    const { x, y } = map.project([lng, lat])
    return { x, y }
  },
  show: ({ lat, lng, zoom }, motion) => {
    const options = {
      center: [lng, lat] as [number, number],
      ...(zoom === undefined ? {} : { zoom }),
    }
    if (motion) {
      map.easeTo({ ...options, ...animation(motion) })
    } else {
      map.jumpTo(options)
    }
  },
  silenceKeyboard: () => {
    const was = map.keyboard.isEnabled()
    map.keyboard.disable()
    return () => {
      if (was) {
        map.keyboard.enable()
      }
    }
  },
  zoomBy: (direction, motion) => {
    if (direction > 0) {
      map.zoomIn(animation(motion))
    } else {
      map.zoomOut(animation(motion))
    }
  },
})
