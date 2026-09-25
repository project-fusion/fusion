import type { MapDriver } from '../connect-map/connect-map.js'

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
  off(type: 'layeradd layerremove', listener: () => void): unknown
  on(type: 'layeradd layerremove', listener: () => void): unknown
  panBy(offset: [number, number], options?: { animate?: boolean }): unknown
  /** The zoom buttons Leaflet adds unless told not to. */
  zoomControl?: { remove(): unknown } | undefined
  zoomIn(delta?: number, options?: { animate?: boolean }): unknown
  zoomOut(delta?: number, options?: { animate?: boolean }): unknown
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
  panBy: (x, y, animate) => {
    map.panBy([x, y], { animate })
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
  zoomBy: (direction, animate) => {
    if (direction > 0) {
      map.zoomIn(1, { animate })
    } else {
      map.zoomOut(1, { animate })
    }
  },
})
