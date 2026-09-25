import type { MapDriver } from '../connect-map/connect-map.js'
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
export const leafletDriver = (map: LeafletMap): MapDriver => ({
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
  focusTarget: () => map.getContainer(),
  onView: (moved) => {
    map.on('move zoom resize', moved)
    return () => {
      map.off('move zoom resize', moved)
    }
  },
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
