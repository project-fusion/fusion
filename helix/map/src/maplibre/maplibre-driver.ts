import type { MapDriver } from '../connect-map/connect-map.js'

/**
 * The part of a MapLibre `Map` the driver uses, so this package imports no
 * renderer and a page brings whichever version it has.
 */
export interface MapLibreMap {
  /** The canvas, which MapLibre makes focusable. */
  getCanvas(): HTMLElement
  /** The element the map was made in, which holds its controls. */
  getContainer(): HTMLElement
  /** A source by its id, whose `attribution` is its credit. */
  getSource(id: string): { attribution?: string | undefined } | undefined
  /** The style as it stands, whose sources are the ones to credit. */
  getStyle(): { sources?: Record<string, unknown> | undefined } | undefined
  /** The arrow-key handler MapLibre adds unless told not to. */
  keyboard: { disable(): void; enable(): void; isEnabled(): boolean }
  off(type: 'sourcedata' | 'styledata', listener: () => void): unknown
  on(type: 'sourcedata' | 'styledata', listener: () => void): unknown
  panBy(offset: [number, number], options?: { animate?: boolean }): unknown
  zoomIn(options?: { animate?: boolean }): unknown
  zoomOut(options?: { animate?: boolean }): unknown
}

/** The class MapLibre's own credit control draws, by its documented name. */
const CONTROL = '.maplibregl-ctrl-attrib'

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
  focusTarget: () => map.getCanvas(),
  panBy: (x, y, animate) => {
    map.panBy([x, y], { animate })
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
  zoomBy: (direction, animate) => {
    if (direction > 0) {
      map.zoomIn({ animate })
    } else {
      map.zoomOut({ animate })
    }
  },
})
