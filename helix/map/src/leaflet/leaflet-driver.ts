import type { MapDriver, MapLayerSpec } from '../connect-map/connect-map.js'
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
  off(type: 'layeradd layerremove' | 'move zoom resize', listener: () => void): unknown
  on(type: 'layeradd layerremove' | 'move zoom resize', listener: () => void): unknown
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
  remove(): unknown
}

/**
 * The two constructors a page hands over for routes and areas to be drawn,
 * which is `L` itself: `leafletDriver(map, L)`. **Passed rather than
 * imported**, so this package still depends on no renderer.
 */
export interface LeafletShapes {
  polygon(latlngs: [number, number][], options: LeafletShapeOptions): LeafletShape
  polyline(latlngs: [number, number][], options: LeafletShapeOptions): LeafletShape
}

/** How a shape is painted, in Leaflet's own words for it. */
interface LeafletShapeOptions {
  color: string
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
  /* **Only where the page handed Leaflet over**, as `leafletDriver(map, L)`:
     this package imports no renderer, and a Leaflet shape is made by Leaflet.
     Without it the routes and areas are still named in the frame's list, and
     only not drawn. Leaflet's tiles are pictures rather than a style, so
     nothing replaces its shapes behind its back, and they are drawn again only
     when the connector says one changed. */
  ...(shapes
    ? {
        layers: (read: () => MapLayerSpec[]) => {
          let drawn: LeafletShape[] = []
          const draw = (): void => {
            for (const shape of drawn) {
              shape.remove()
            }
            drawn = read().flatMap((layer) => {
              const latlngs = layer.points.map(({ lat, lng }): [number, number] => [lat, lng])
              /* The casing first, so the route is drawn over it. */
              const casing =
                layer.kind === 'route' && layer.casing
                  ? [
                      shapes.polyline(latlngs, {
                        color: layer.casing,
                        interactive: false,
                        lineCap: 'round',
                        lineJoin: 'round',
                        weight: 7,
                      }),
                    ]
                  : []
              const shape =
                layer.kind === 'route'
                  ? shapes.polyline(latlngs, {
                      color: layer.color,
                      interactive: false,
                      lineCap: 'round',
                      lineJoin: 'round',
                      weight: 4,
                    })
                  : shapes.polygon(latlngs, {
                      color: layer.color,
                      fillColor: layer.color,
                      fillOpacity: 0.16,
                      interactive: false,
                      weight: 1.5,
                    })
              for (const one of [...casing, shape]) {
                one.addTo(map as never)
              }
              return [...casing, shape]
            })
          }
          draw()
          return {
            stop: () => {
              for (const shape of drawn) {
                shape.remove()
              }
              drawn = []
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
  zoomBy: (direction, motion) => {
    if (direction > 0) {
      map.zoomIn(1, { animate: motion !== null })
    } else {
      map.zoomOut(1, { animate: motion !== null })
    }
  },
})
