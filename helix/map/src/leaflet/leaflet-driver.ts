import type {
  MapDriver,
  MapLayerEvents,
  MapLayerSpec,
  MapPlace,
} from '../connect-map/connect-map.js'
import type { MapMotion } from '../motion/motion.js'

/** How Leaflet is told to move: over a time, in seconds, or at once. */
interface LeafletAnimation {
  animate?: boolean
  duration?: number
}

/** The part of a Leaflet layer the driver reads. */
export interface LeafletLayer {
  /** The layer's credit, where it has one. */
  getAttribution?: (() => string | null | undefined) | undefined
  /** Whether a tile layer still has tiles on the way. */
  isLoading?: (() => boolean) | undefined
  off?: ((type: 'load', listener: () => void) => unknown) | undefined
  once?: ((type: 'load', listener: () => void) => unknown) | undefined
}

/** The credit control Leaflet adds unless told not to. */
export interface LeafletAttribution {
  /** What Leaflet writes before the layers' credits, which is its own name by default. */
  options: { prefix?: string | boolean | undefined }
  remove(): unknown
}

/**
 * The part of a Leaflet `Map` the driver uses, so this package imports no
 * renderer and a page brings whichever version it has.
 */
export interface LeafletMap {
  addControl(control: never): unknown
  /** The credit control, absent where the map was made without one. */
  attributionControl?: LeafletAttribution | undefined
  eachLayer(visit: (layer: LeafletLayer) => void): unknown
  /** The element the map was made in, which Leaflet makes focusable. */
  getContainer(): HTMLElement
  /** The arrow-key handler, absent where the map was made with `keyboard: false`. */
  keyboard?: { disable(): unknown; enable(): unknown; enabled(): boolean } | undefined
  /** Where a place falls in the map's box, in pixels. */
  latLngToContainerPoint(latLng: [number, number]): { x: number; y: number }
  off(type: 'layeradd layerremove' | 'move zoom resize' | 'moveend', listener: () => void): unknown
  on(type: 'layeradd layerremove' | 'move zoom resize' | 'moveend', listener: () => void): unknown
  fitBounds(
    bounds: [[number, number], [number, number]],
    options?: LeafletAnimation & {
      paddingBottomRight?: [number, number]
      paddingTopLeft?: [number, number]
    },
  ): unknown
  panBy(offset: [number, number], options?: LeafletAnimation): unknown
  /** Goes to a place, at its zoom or the one it is at. */
  setView(center: [number, number], zoom?: number, options?: LeafletAnimation): unknown
  /** The zoom buttons Leaflet adds unless told not to. */
  zoomControl?: { remove(): unknown } | undefined
  /** How far the view is zoomed in. */
  getZoom?(): number
  zoomIn(delta?: number, options?: { animate?: boolean }): unknown
  zoomOut(delta?: number, options?: { animate?: boolean }): unknown
}

/**
 * The page's motion as Leaflet takes it. **The duration and not the curve**:
 * Leaflet eases a pan by a linearity rather than a function, so there is no
 * curve to hand it, and it zooms with a transition of its own stylesheet's,
 * so a zoom is animated or not and takes no duration either.
 */
const animation = (motion: MapMotion | null): LeafletAnimation =>
  motion ? { animate: true, duration: motion.duration / 1000 } : { animate: false }

/**
 * A drawn shape, as far as the driver handles one: put on the map, and taken
 * off. `addTo` takes `never` for `addControl`'s reason: Leaflet types it as its
 * own `Map`, which this package does not import.
 */
export interface LeafletShape {
  addTo(map: never): unknown
  /** Hears a press, which a point that can be pressed takes. */
  on?(type: 'click', listener: () => void): unknown
  remove(): unknown
}

/**
 * The two constructors a page hands over for routes and areas to be drawn,
 * which is `L` itself: `leafletDriver(map, L)`. **Passed rather than
 * imported**, so this package still depends on no renderer.
 */
export interface LeafletShapes {
  /** A point drawn as a circle a fixed size on screen, which a points layer is drawn in. */
  circleMarker?(
    latlng: [number, number],
    options: LeafletShapeOptions & { radius: number },
  ): LeafletShape
  /** An icon of the page's own markup, which an area's caption is drawn in. */
  divIcon?(options: { className: string; html: HTMLElement; iconSize: [number, number] }): unknown
  /**
   * A marker at a place, which an area's caption stands on. `icon` takes
   * `never` for `addTo`'s reason: it is what `divIcon` made, which Leaflet
   * types as its own class.
   */
  marker?(
    latlng: [number, number],
    options: { icon: never; interactive: boolean; keyboard: boolean },
  ): LeafletShape
  polygon(latlngs: [number, number][], options: LeafletShapeOptions): LeafletShape
  polyline(latlngs: [number, number][], options: LeafletShapeOptions): LeafletShape
  /** A layer of map tiles from a URL, which a raster layer's frames are drawn in. */
  tileLayer?(
    url: string,
    options: { attribution?: string; maxNativeZoom?: number; opacity: number; zIndex?: number },
  ): LeafletTiles
}

/** A tile layer, which a raster layer's frame is, faded in and out by opacity. */
export interface LeafletTiles extends LeafletShape {
  setOpacity(opacity: number): unknown
}

/** How a shape is painted, in Leaflet's own words for it. */
interface LeafletShapeOptions {
  color: string
  dashArray?: string
  opacity?: number
  fillColor?: string
  fillOpacity?: number
  interactive: boolean
  lineCap?: 'round'
  lineJoin?: 'round'
  weight: number
}

/**
 * Drives a Leaflet map from the Map frame.
 *
 * **The credit is the control's prefix and every layer's attribution**, in the
 * order Leaflet's own control draws them, read again as layers come and go.
 * **The control is taken off while connected and put back after**, which
 * Leaflet allows through its public API, unlike MapLibre. **So are its zoom
 * buttons**, which Leaflet adds by default and MapLibre does not, where the
 * frame draws its own. A zoom step is one level, which is what Leaflet's own
 * buttons take.
 */
export const leafletDriver = (map: LeafletMap, shapes?: LeafletShapes): MapDriver => ({
  credits(changed) {
    const control = map.attributionControl
    control?.remove()
    map.on('layeradd layerremove', changed)
    return {
      read: () => {
        const prefix = control?.options.prefix
        const credits: string[] = typeof prefix === 'string' && prefix !== '' ? [prefix] : []
        map.eachLayer((layer) => {
          const credit = layer.getAttribution?.()
          if (credit) {
            credits.push(credit)
          }
        })
        return credits
      },
      stop: () => {
        map.off('layeradd layerremove', changed)
        if (control) {
          map.addControl(control as never)
        }
      },
    }
  },
  fit: ({ northEast, southWest }, padding, motion) => {
    const inset =
      typeof padding === 'number'
        ? { bottom: padding, left: padding, right: padding, top: padding }
        : padding
    map.fitBounds(
      [
        [southWest.lat, southWest.lng],
        [northEast.lat, northEast.lng],
      ],
      {
        ...animation(motion),
        paddingBottomRight: [inset.right, inset.bottom],
        paddingTopLeft: [inset.left, inset.top],
      },
    )
  },
  focusTarget: () => map.getContainer(),
  onView: (moved) => {
    map.on('move zoom resize', moved)
    return () => {
      map.off('move zoom resize', moved)
    }
  },
  /* **Ready once every tile layer still loading has loaded**, each firing
     its own `load`, or at once where none is. */
  ready: (done) => {
    const loading: LeafletLayer[] = []
    map.eachLayer((layer) => {
      if (layer.isLoading?.()) {
        loading.push(layer)
      }
    })
    if (loading.length === 0) {
      done()
      return () => undefined
    }
    let left = loading.length
    const heard = (): void => {
      left -= 1
      if (left === 0) {
        done()
      }
    }
    for (const layer of loading) {
      layer.once?.('load', heard)
    }
    return () => {
      for (const layer of loading) {
        layer.off?.('load', heard)
      }
    }
  },
  /* **Only where the page handed Leaflet over**, as `leafletDriver(map, L)`:
     this package imports no renderer, and a Leaflet shape is made by Leaflet.
     Without it the routes and areas are still named in the frame's list, and
     only not drawn. Leaflet's tiles are pictures rather than a style, so
     nothing replaces its shapes behind its back, and they are drawn again only
     when the connector says one changed. */
  ...(shapes
    ? {
        layers: (read: () => MapLayerSpec[], events?: MapLayerEvents) => {
          let drawn: LeafletShape[] = []
          /* **Each points layer's circles, kept while its points and colors
             are**: the connector hands the same array while the data is, so
             a route's progress ticking no longer took every circle off the
             map and put it back, each one a credit read in turn. */
          const circles = new Map<
            string,
            {
              casing?: string | undefined
              color: string
              points: MapPlace[]
              shapes: LeafletShape[]
            }
          >()
          /* Each points layer's points, for the keyboard's walk of those in view. */
          let placed = new Map<string, MapPlace[]>()
          /**
           * An area's caption, as a marker no one presses or reaches with the
           * keyboard, its words set as text, never as markup, and drawn in
           * the connector's colors with the halo as a shadow round them.
           * Nothing where the page did not hand over `marker` and `divIcon`.
           */
          const captionOf = (caption: MapLayerSpec['caption']): LeafletShape[] => {
            if (!caption || !shapes.marker || !shapes.divIcon) {
              return []
            }
            const words = document.createElement('span')
            words.textContent = caption.text
            const halo = caption.halo
            Object.assign(words.style, {
              color: caption.ink,
              font: '600 14px/1 var(--helix-font-sans, sans-serif)',
              left: '0',
              pointerEvents: 'none',
              position: 'absolute',
              textShadow: `0 0 2px ${halo}, 0 0 2px ${halo}, 0 0 3px ${halo}`,
              top: '0',
              transform:
                caption.anchor === 'bottom' ? 'translate(-50%, -130%)' : 'translate(-50%, -50%)',
              whiteSpace: 'nowrap',
            })
            return [
              shapes.marker([caption.at.lat, caption.at.lng], {
                icon: shapes.divIcon({
                  className: 'helix-map-caption',
                  html: words,
                  iconSize: [0, 0],
                }) as never,
                interactive: false,
                keyboard: false,
              }),
            ]
          }
          /* **A raster layer's frames are kept between redraws**, one tile
             layer each and switched by opacity, so a playing loop does not
             load its tiles again on every frame. */
          const rasters = new Map<string, { key: string; tiles: LeafletTiles[] }>()
          const drawRasters = (specs: MapLayerSpec[]): void => {
            const make = shapes.tileLayer
            const wanted = new Set(specs.map((spec) => spec.id))
            for (const [id, had] of [...rasters]) {
              if (!wanted.has(id)) {
                for (const tiles of had.tiles) {
                  tiles.remove()
                }
                rasters.delete(id)
              }
            }
            if (!make) {
              return
            }
            for (const spec of specs) {
              const frames = spec.frames ?? []
              const key = `${frames.join(' ')}|${spec.maxZoom ?? ''}`
              let had = rasters.get(spec.id)
              if (had?.key !== key) {
                for (const tiles of had?.tiles ?? []) {
                  tiles.remove()
                }
                had = {
                  key,
                  tiles: frames.map((url) => {
                    const tiles = make(url, {
                      ...(spec.attribution ? { attribution: spec.attribution } : {}),
                      ...(spec.maxZoom === undefined ? {} : { maxNativeZoom: spec.maxZoom }),
                      opacity: 0,
                    })
                    tiles.addTo(map as never)
                    return tiles
                  }),
                }
                rasters.set(spec.id, had)
              }
              for (const [at, tiles] of had.tiles.entries()) {
                tiles.setOpacity(at === spec.frame ? (spec.opacity ?? 0.7) : 0)
              }
            }
          }
          const draw = (): void => {
            for (const shape of drawn) {
              shape.remove()
            }
            const specs = read()
            const kept = new Set<string>()
            placed = new Map()
            /* Buildings are not drawn: Leaflet draws maps flat. */
            drawRasters(specs.filter((spec) => spec.kind === 'raster'))
            drawn = specs.flatMap((layer) => {
              if (
                layer.kind === 'buildings' ||
                layer.kind === 'raster' ||
                layer.kind === 'terrain' ||
                layer.kind === 'contours' ||
                layer.kind === 'landcover'
              ) {
                return []
              }
              const latlngs = layer.points.map(({ lat, lng }): [number, number] => [lat, lng])
              /* **Points as circles, and unclustered**: Leaflet gathers
                 markers only with a plugin this package does not bring, so a
                 points layer here is every point, which is right for
                 hundreds and slow for thousands, where MapLibre is the
                 renderer to connect. */
              if (layer.kind === 'points') {
                const circle = shapes.circleMarker
                if (!circle) {
                  return []
                }
                kept.add(layer.id)
                placed.set(layer.id, layer.points)
                const had = circles.get(layer.id)
                if (
                  had &&
                  had.points === layer.points &&
                  had.color === layer.color &&
                  had.casing === layer.casing
                ) {
                  return []
                }
                for (const shape of had?.shapes ?? []) {
                  shape.remove()
                }
                const made = latlngs.map((latlng, at) => {
                  const point = circle(latlng, {
                    color: layer.casing ?? layer.color,
                    fillColor: layer.color,
                    fillOpacity: 1,
                    interactive: true,
                    radius: 5,
                    weight: 1.5,
                  })
                  point.on?.('click', () => events?.press(layer.id, at))
                  point.addTo(map as never)
                  return point
                })
                circles.set(layer.id, {
                  casing: layer.casing,
                  color: layer.color,
                  points: layer.points,
                  shapes: made,
                })
                return []
              }
              /* The casing first, so the route is drawn over it. */
              const casing =
                layer.kind === 'route' && layer.casing
                  ? [
                      shapes.polyline(latlngs, {
                        color: layer.casing,
                        interactive: false,
                        lineCap: 'round',
                        lineJoin: 'round',
                        opacity: layer.faded ? 0.4 : 1,
                        weight: 7,
                      }),
                    ]
                  : []
              const shape =
                layer.kind === 'route'
                  ? shapes.polyline(latlngs, {
                      color: layer.color,
                      /* Dashes of no length with round caps, which are dots. */
                      ...(layer.pattern === 'dotted' ? { dashArray: '0 10' } : {}),
                      interactive: false,
                      lineCap: 'round',
                      lineJoin: 'round',
                      opacity: layer.faded ? 0.4 : 1,
                      weight: 4,
                    })
                  : shapes.polygon(latlngs, {
                      color: layer.color,
                      fillColor: layer.color,
                      fillOpacity: 0.16,
                      interactive: false,
                      weight: 1.5,
                    })
              const caption = layer.kind === 'area' ? captionOf(layer.caption) : []
              for (const one of [...casing, shape, ...caption]) {
                one.addTo(map as never)
              }
              return [...casing, shape, ...caption]
            })
            for (const [id, had] of [...circles]) {
              if (!kept.has(id)) {
                for (const shape of had.shapes) {
                  shape.remove()
                }
                circles.delete(id)
              }
            }
            events?.settled?.()
          }
          /* **The walk asked again once a move ends**, which is the keyboard's
             way to the points: without `inView` a points layer on Leaflet was
             never a tab stop, though the guide says it is. */
          const settled = (): void => events?.settled?.()
          map.on('moveend', settled)
          draw()
          return {
            /* The points of a layer inside the map's box, each by its place in
               the layer: Leaflet draws them unclustered, so none is a count. */
            inView: (id) => {
              const box = map.getContainer()
              const width = box.clientWidth
              const height = box.clientHeight
              return (placed.get(id) ?? []).flatMap((place, at) => {
                const { x, y } = map.latLngToContainerPoint([place.lat, place.lng])
                return x >= 0 && y >= 0 && x <= width && y <= height ? [{ at, place }] : []
              })
            },
            stop: () => {
              map.off('moveend', settled)
              for (const shape of drawn) {
                shape.remove()
              }
              drawn = []
              for (const had of circles.values()) {
                for (const shape of had.shapes) {
                  shape.remove()
                }
              }
              circles.clear()
              drawRasters([])
            },
            update: draw,
          }
        },
      }
    : {}),
  panBy: (x, y, motion) => {
    map.panBy([x, y], animation(motion))
  },
  project: ({ lat, lng }) => {
    const { x, y } = map.latLngToContainerPoint([lat, lng])
    return { x, y }
  },
  replaceZoom: () => {
    const control = map.zoomControl
    control?.remove()
    return () => {
      if (control) {
        map.addControl(control as never)
      }
    }
  },
  show: ({ lat, lng, zoom }, motion) => {
    map.setView([lat, lng], zoom, animation(motion))
  },
  silenceKeyboard: () => {
    const handler = map.keyboard
    const was = handler?.enabled() ?? false
    handler?.disable()
    return () => {
      if (was) {
        handler?.enable()
      }
    }
  },
  /* Only where the map can say, so the frame never announces a level it made
     up. */
  ...(map.getZoom ? { zoom: () => map.getZoom?.() ?? 0 } : {}),
  zoomBy: (direction, motion) => {
    if (direction > 0) {
      map.zoomIn(1, { animate: motion !== null })
    } else {
      map.zoomOut(1, { animate: motion !== null })
    }
  },
})
